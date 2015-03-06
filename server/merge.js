var Git = require('nodegit');
var fs = require('fs');
var path = require('path');
var Promise = require('promise');

function PullRequest(repoName, srcOrg, srcBranch, destOrg, destBranch) {
    this.repoName = repoName;
    this.srcOrg = srcOrg;
    this.srcBranch = srcBranch;
    this.destOrg = destOrg;
    this.destBranch = destBranch;

    this.promise = null;
    this.repo = null;
    this.srcRemote = null;
    this.destRemote = null;
    this.srcHeadCommit = null;
    this.destHeadCommit = null;
    this.mergeBaseCommit = null;
    this.squashCommit = null;
    this.rebasedCommit = null;
}

PullRequest.prototype.fancyMerge = function(commitMessage) {
    return this._loadRepo()
    
    // Setup Remotes
    .then(function() {
        console.log('setting up remotes');
        return this._setupRemote(this.srcOrg, this.srcBranch).catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this))
    .then(function(remote) {
        this.srcRemote = remote;
        return this._setupRemote(this.destOrg, this.destBranch).catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this))
    .then(function(remote) {
        this.destRemote = remote;
        return this._fetchRemotes().catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this))

    // Determine the Merge Base
    .then(function() {
        console.log('determining merge base');
        this._findRemoteCommits().catch(function(reason) { console.log('1 ' + reason); });
        return this._findMergeBase().catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this))

    // Squash Src Branch into squashCommit
    .then(function() {
        console.log('sqashing');
        this._forceCreateBranchFromCommit(this.srcBranch, this.srcHeadCommit).catch(function(reason) { console.log('1 ' + reason); });
        this._forceCheckoutBranch(this.srcBranch).catch(function(reason) { console.log('1 ' + reason); });
        this._softResetToCommit(this.mergeBaseCommit).catch(function(reason) { console.log('1 ' + reason); });
        return this._commitIndexToHead(commitMessage, this.srcHeadCommit.author());
    }.bind(this))
    .then(function(commit) {
        this.squashCommit = commit;
    }.bind(this))

    // Cherrypick squashCommit onto Dest Branch
    .then(function() {
        console.log('cherrypick');
        this._forceCreateBranchFromCommit(this.destBranch, this.destHeadCommit).catch(function(reason) { console.log('1 ' + reason); });
        this._forceCheckoutBranch(this.destBranch).catch(function(reason) { console.log('1 ' + reason); });
        this._cherrypickCommitOntoIndexAndWorkspace(this.squashCommit).catch(function(reason) { console.log('1 ' + reason); });
        return this._commitIndexToHead(commitMessage, this.squashCommit.author()).catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this))
    .then(function(commit) {
        this.rebasedCommit = commit;
    }.bind(this))

    // Sync Dest Branch to Src Branch and push back up
    .then(function() {
        console.log('pushing');
        this._forceCreateBranchFromCommit(this.srcBranch, this.rebasedCommit).catch(function(reason) { console.log('1 ' + reason); });
        this._pushBranchToRemote(this.srcBranch, this.srcRemote, true).catch(function(reason) { console.log('1 ' + reason); });
        return this._pushBranchToRemote(this.destBranch, this.destRemote, false).catch(function(reason) { console.log('1 ' + reason); });
    }.bind(this));
};

PullRequest.getUrlForOrganization = function(organization, repo) {
    return 'git@github.com:' + organization + '/' + repo + '.git';
};

PullRequest.prototype._verifyLocalGitRepository = function(localPath) {
    try {
        var stats = fs.lstatSync(localPath + '/.git');
        return stats.isDirectory();
    } catch(e) {
        return false;
    }
};

PullRequest.prototype._loadRepo = function() {
    var repoPath = 'repos/' + this.destOrg + '/' + this.repoName,
        localPath = path.join(__dirname, repoPath),
        alreadyCloned = this._verifyLocalGitRepository(localPath),
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
        repoPromise = Git.Clone.clone(PullRequest.getUrlForOrganization(this.destOrg, this.repoName), localPath, cloneOptions);
    }
    this.promise = repoPromise.then(function(repo) {
        this.repo = repo;
    }.bind(this), function(err) {
        throw err;
    });
    return this.promise;
};

PullRequest.prototype._setupRemote = function(organization, branch) {
    if (!this.promise) {
        throw Error('No promise is defined. loadRepoFromGithub first');
    }

    this.promise = this.promise.then(function() {
        if (!this.repo) {
            throw Error('No repo defined');
        }
        return Git.Remote.list(this.repo);
    }.bind(this))
    .then(function(remoteList) {
        var remotePromise;
        if (remoteList.indexOf(organization) < 0) {
            remotePromise = Git.Remote.create(this.repo, organization, PullRequest.getUrlForOrganization(organization, this.repoName));
        } else {
            remotePromise = Git.Remote.lookup(this.repo, organization, null);
        }
        return remotePromise;
    }.bind(this), function(err) {
        console.log(0);
        console.log(err);
        process.exit();
    });
    return this.promise;
};

PullRequest.prototype._fetchRemotes = function() {
    this.promise = this.promise.then(function(destRemote) {
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
    }.bind(this), function(err) {
        console.log(0.3);
        console.log(err);
        process.exit();
    })
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
    return this.promise;
};

PullRequest.prototype._findRemoteCommits = function() {
    this.promise = this.promise.then(function() {
        console.log('creating revparse for ' + this.srcOrg + '/' + this.srcBranch + ' and ' + this.destOrg + '/' + this.destBranch);
        var srcCommitIdPromise = this.repo.getBranchCommit(this.srcOrg + '/' + this.srcBranch),
            destCommitIdPromise = this.repo.getBranchCommit(this.destOrg + '/' + this.destBranch);
        return Promise.all([srcCommitIdPromise, destCommitIdPromise]);
    }.bind(this), function(err) { 
        console.log(1);
        console.log(err);
        process.exit();
    })
    .then(function(commitArray) {
        this.srcHeadCommit = commitArray[0];
        this.destHeadCommit = commitArray[1];
    }.bind(this), function(err) {
        console.log(2);
        console.log(err);
    });
    return this.promise;
};

PullRequest.prototype._findMergeBase = function() {
    this.promise = this.promise.then(function() {
        return Git.Merge.base(this.repo, this.srcHeadCommit.id().toString(), this.destHeadCommit.id().toString());    
    }.bind(this), function(err) {
        console.log(2);
        console.log(err);
    }).then(function(mergeBaseCommitId) {
        return this.repo.getCommit(mergeBaseCommitId);
    }.bind(this))
    .then(function(mergeBaseCommit) {
        this.mergeBaseCommit = mergeBaseCommit;
    }.bind(this), function(err) { console.log(3.5); console.log(err); process.exit(); });
    return this.promise;
};

PullRequest.prototype._forceCreateBranchFromCommit = function(branchName, commit) {
    this.promise = this.promise.then(function() {
        console.log('forceCreateBranchFromCommit');
        return Git.Branch.create(this.repo, branchName, commit, 1, Git.Signature.default(this.repo), null);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._forceCheckoutBranch = function(branchName) {
    this.promise = this.promise.then(function() {
        console.log('forceCheckoutBranch');
        return this.repo.checkoutBranch('refs/heads/' + branchName, { checkoutStrategy: Git.Checkout.STRATEGY.FORCE });
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._softResetToCommit = function(commit) {
    this.promise = this.promise.then(function() {
        console.log('softReset');
        return Git.Reset.reset(this.repo, commit, Git.Reset.TYPE.SOFT);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._commitIndexToHead = function(commitMessage, author) {
    this.promise = this.promise.then(function() {
        console.log('committing');
        return this.repo.createCommitOnHead([], author, Git.Signature.default(this.repo), commitMessage);
    }.bind(this))
    .then(function(commitId) {
        console.log('gettingCommit');
        return this.repo.getCommit(commitId);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._cherrypickCommitOntoIndexAndWorkspace = function(commit) {
    this.promise = this.promise.then(function() {
        var cpOptions = new Git.CherrypickOptions();
        return Git.Cherrypick.cherrypick(this.repo, commit, cpOptions);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._pushBranchToRemote = function(branchName, remote, force) {
    this.promise = this.promise.then(function() {
        var refspec = 'refs/heads/' + branchName + ':refs/heads/' + branchName;
        if (force) {
            refspec = '+' + refspec;
        }
        return remote.push([refspec], null, Git.Signature.default(this.repo), 'Push to ' + remote.name() + '/' + branchName);
    }.bind(this));
    return this.promise;
};

module.exports = PullRequest;
