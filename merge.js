var Git = require('nodegit');
var fs = require('fs');
var path = require('path');
var Promise = require('promise');

function GitState(repoName, srcOrg, srcBranch, destOrg, destBranch) {
    this.repoName = repoName;
    this.srcOrg = srcOrg;
    this.srcBranch = srcBranch;
    this.destOrg = destOrg;
    this.destBranch = destBranch;

    this.promise = null;
    this.repo = null;
    this.srcRemote = null;
    this.destRemote = null;
    this.srcHeadCommitId = null;
    this.destHeadCommitId = null;
    this.mergeBaseCommitId = null;
}

GitState.getUrlForOrganization = function(organization, repo) {
    return 'git@github.com:' + organization + '/' + repo + '.git';
};

GitState.prototype.loadRepoFromGithub = function() {
    var repoPath = 'repos/' + this.destOrg + '/' + this.repoName,
        localPath = path.join(__dirname, repoPath),
        alreadyCloned = verifyIsGitRepository(localPath),
        cloneOptions = {};

    cloneOptions.remoteCallbacks = {
        certificateCheck: function() { return 1; },
        credentials: function(url, userName) {
            return Git.Cred.sshKeyFromAgent(userName);
        }
    };

    localPath = path.join(__dirname, repoPath);
    console.log(alreadyCloned);
    console.log(localPath);
    if (alreadyCloned) {
        repoPromise = Git.Repository.open(localPath);
    } else {
        repoPromise = Git.Clone.clone(GitState.getUrlForOrganization(this.destOrg, this.repoName), localPath, cloneOptions);
    }
    this.promise = repoPromise.then(function(repo) {
        this.repo = repo;
    }.bind(this), function(err) {
        throw err;
    });
};

GitState.prototype.setupRemotes = function() {
    if (!this.promise) {
        throw Error('No promise is defined. loadRepoFromGithub first');
    }

    this.promise = this.promise.then(function() {
        if (!this.repo) {
            throw Error('No repo defined');
        } else if (this.srcRemote || this.destRemote) {
            throw Error('Some remotes have already been loaded');
        }
        return Git.Remote.list(this.repo);
    }.bind(this))
    .then(function(remoteList) {
        var srcPromise;
        if (remoteList.indexOf(this.srcOrg) < 0) {
            srcPomise = Git.Remote.create(this.repo, this.srcOrg, GitState.getUrlForOrganization(this.srcOrg, this.repoName));
        } else {
            srcPromise = Git.Remote.lookup(this.repo, this.srcOrg, null);
        }
        return srcPromise;
        
    }.bind(this), function(err) {
        console.log(0);
        console.log(err);
        process.exit();
    })
    .then(function(srcRemote) {
        this.srcRemote = srcRemote; 
        return Git.Remote.list(this.repo);
    }.bind(this))
    .then(function(remoteList) {
        var destPromise;
        if (remoteList.indexOf(this.destOrg) < 0) {
            destPromise = Git.Remote.create(this.repo, this.destOrg, GitState.getUrlForOrganization(this.destOrg, this.repoName));
        } else {
            destPromise = Git.Remote.lookup(this.repo, this.destOrg, null);
        }
        return destPromise;
    }.bind(this))
    .then(function(destRemote) {
        this.destRemote = destRemote;
        remoteCallbacks = {};

        remoteCallbacks = {
            certificateCheck: function() { return 1; },
            credentials: function(url, userName) {
                return Git.Cred.sshKeyFromAgent(userName);
            }
        };
        this.srcRemote.setCallbacks(remoteCallbacks);
        this.destRemote.setCallbacks(remoteCallbacks);
        return this.srcRemote.fetch(null, Git.Signature.default(this.repo), null);
    }.bind(this))
    .then(function() {
        if (this.srcOrg !== this.destOrg) {
            return this.destRemote.fetch(null, Git.Signature.default(this.repo), null);
        } else {
            return Promise.resolve();
        }
    }.bind(this), function(err) {
        console.log(0.5);
        console.log(err);
        process.exit();
    });
};

GitState.prototype.findMergeBase = function() {
    this.promise = this.promise.then(function() {
        console.log('creating revparse for ' + this.srcOrg + '/' + this.srcBranch + ' and ' + this.destOrg + '/' + this.destBranch);
        var srcCommitIdPromise = Git.Revparse.single(this.repo, 'refs/remotes/' + this.srcOrg + '/' + this.srcBranch);
            destCommitIdPromise = Git.Revparse.single(this.repo, 'refs/remotes/' + this.destOrg + '/' + this.destBranch);
        return Promise.all([srcCommitIdPromise, destCommitIdPromise]);
    }.bind(this), function(err) { 
        console.log(1);
        console.log(err);
        process.exit();
    }).then(function(commitArray) {
        this.srcHeadCommitId = commitArray[0];
        this.destHeadCommitId = commitArray[1];
        console.log('getting merge base for');
        console.log(this.srcHeadCommitId);
        console.log(this.destHeadcommitId);
        return Git.Merge.base(this.repo, this.srcHeadCommitId, this.destHeadCommitId);    
    }.bind(this), function(err) {
        console.log(2);
        console.log(err);
    }).then(function(mergeBaseCommitId) {
        this.mergeBaseCommitId = mergeBaseCommitId;
    }.bind(this), function(err) { throw(err); });
};

function verifyIsGitRepository(localPath) {
    try {
        var stats = fs.lstatSync(localPath + '/.git');
        return stats.isDirectory();
    } catch(e) {
        return false;
    }
}

var state = new GitState('dummyRepo', 'jrbalsano', 'good', 'jrbalsano', 'master');
state.loadRepoFromGithub();
state.setupRemotes();
state.findMergeBase();
state.promise.then(function() {
    console.log('merge base: ' + state.mergeBaseCommitId);
});
