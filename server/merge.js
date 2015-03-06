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
PullRequest.PREFIX = '_ng-';
PullRequest.SRC_PREFIX = 'src-';
PullRequest.DEST_PREFIX = 'dest-';

PullRequest.prototype.fancyMerge = function(commitMessage) {
    return this._loadRepo()
    
    // Setup Remotes
    .then(function() {
        console.log('==REMOTE SETUP==');
        return this._setupRemote(this.srcOrg, this.srcBranch);
    }.bind(this))
    .then(function(remote) {
        this.srcRemote = remote;
        return this._setupRemote(this.destOrg, this.destBranch);
    }.bind(this))
    .then(function(remote) {
        this.destRemote = remote;
        return this._fetchRemotes();
    }.bind(this))

    // Determine the Merge Base
    .then(function() {
        console.log('==COMMIT IDENTIFICATION==');
        this._findRemoteCommits();
        return this._findMergeBase();
    }.bind(this))

    // Squash Src Branch into squashCommit
    .then(function() {
        console.log('==SQUASH==');
        this._forceCreateBranchFromCommit(this.srcBranch, this.srcHeadCommit, PullRequest.SRC_PREFIX);
        this._forceCheckoutBranch(this.srcBranch, PullRequest.SRC_PREFIX);
        this._softResetToCommit(this.mergeBaseCommit);
        return this._commitIndexToHead(commitMessage, this.srcHeadCommit.author());
    }.bind(this))
    .then(function(commit) {
        this.squashCommit = commit;
    }.bind(this))

    // Cherrypick squashCommit onto Dest Branch
    .then(function() {
        console.log('==CHERRYPICK==');
        this._forceCreateBranchFromCommit(this.destBranch, this.destHeadCommit, PullRequest.DEST_PREFIX);
        this._forceCheckoutBranch(this.destBranch, PullRequest.DEST_PREFIX);
        this._cherrypickCommitOntoIndexAndWorkspace(this.squashCommit);
        return this._commitIndexToHead(commitMessage, this.squashCommit.author());
    }.bind(this))
    .then(function(commit) {
        this.rebasedCommit = commit;
    }.bind(this))

    // Sync Dest Branch to Src Branch and push back up
    .then(function() {
        console.log('==PUSH==');
        this._forceCreateBranchFromCommit(this.srcBranch, this.rebasedCommit, PullRequest.SRC_PREFIX).catch(function(reason) { console.log('1 ' + reason); });
        this._pushBranchToRemote(this.srcBranch, this.srcRemote, true, PullRequest.SRC_PREFIX).catch(function(reason) { console.log('1 ' + reason); });
        return this._pushBranchToRemote(this.destBranch, this.destRemote, false, PullRequest.DEST_PREFIX).catch(function(reason) { console.log('1 ' + reason); });
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
    if (alreadyCloned) {
        console.log('Opening repo at ' + localPath);
        repoPromise = Git.Repository.open(localPath);
    } else {
        console.log('Cloning repo from ' + PullRequest.getUrlForOrganization(this.destOrg, this.repoName) + ' to ' + localPath);
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
        console.log('Setting up remote ' + organization);
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
        console.log('Fetching from src remote ' + this.srcRemote.name());
        return this.srcRemote.fetch(null, Git.Signature.default(this.repo), null);
    }.bind(this), function(err) {
        console.log(0.3);
        console.log(err);
        process.exit();
    })
    .then(function() {
        if (this.srcOrg !== this.destOrg) {
            console.log('Fetching from dest remote ' + this.destRemote.name());
            return this.destRemote.fetch(null, Git.Signature.default(this.repo), null);
        } else {
            console.log('Dest remote is src remote, no need to fetch it');
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
        console.log('Finding commits for ' + this.srcOrg + '/' + this.srcBranch + ' and ' + this.destOrg + '/' + this.destBranch);
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
        console.log('Commits found as ' + this.srcHeadCommit.id().toString() + ' and ' + this.destHeadCommit.id().toString());
    }.bind(this), function(err) {
        console.log(2);
        console.log(err);
    });
    return this.promise;
};

PullRequest.prototype._findMergeBase = function() {
    this.promise = this.promise.then(function() {
        console.log('Finding merge base for ' + this.srcHeadCommit.id().toString() + ' and ' + this.destHeadCommit.id().toString());
        return Git.Merge.base(this.repo, this.srcHeadCommit.id().toString(), this.destHeadCommit.id().toString());    
    }.bind(this), function(err) {
        console.log(2);
        console.log(err);
    }).then(function(mergeBaseCommitId) {
        console.log('Merge base found at ' + mergeBaseCommitId);
        return this.repo.getCommit(mergeBaseCommitId);
    }.bind(this))
    .then(function(mergeBaseCommit) {
        this.mergeBaseCommit = mergeBaseCommit;
    }.bind(this), function(err) { console.log(3.5); console.log(err); process.exit(); });
    return this.promise;
};

PullRequest.prototype._forceCreateBranchFromCommit = function(branchName, commit, localPrefix) {
    this.promise = this.promise.then(function() {
        var prefixedBranch = PullRequest.PREFIX + localPrefix + branchName;
        console.log('Force creating branch ' + prefixedBranch + ' from commit ' + commit.id().toString());
        return Git.Branch.create(this.repo, prefixedBranch, commit, 1, Git.Signature.default(this.repo), null);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._forceCheckoutBranch = function(branchName, localPrefix) {
    this.promise = this.promise.then(function() {
        var prefixedBranch = PullRequest.PREFIX + localPrefix + branchName;
        console.log('Force checking out branch ' + prefixedBranch);
        return this.repo.checkoutBranch('refs/heads/' + prefixedBranch, { checkoutStrategy: Git.Checkout.STRATEGY.FORCE });
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._softResetToCommit = function(commit) {
    this.promise = this.promise.then(function() {
        console.log('Performing a soft reset to ' + commit.id().toString());
        return Git.Reset.reset(this.repo, commit, Git.Reset.TYPE.SOFT);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._commitIndexToHead = function(commitMessage, author) {
    this.promise = this.promise.then(function() {
        console.log('Committing index to HEAD');
        return this.repo.createCommitOnHead([], author, Git.Signature.default(this.repo), commitMessage);
    }.bind(this))
    .then(function(commitId) {
        console.log('Commit created: ' + commitId);
        return this.repo.getCommit(commitId);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._cherrypickCommitOntoIndexAndWorkspace = function(commit) {
    this.promise = this.promise.then(function() {
        var cpOptions = new Git.CherrypickOptions();
        console.log('cherrypicking ' + commit.id().toString() + ' onto index and workspace');
        return Git.Cherrypick.cherrypick(this.repo, commit, cpOptions);
    }.bind(this));
    return this.promise;
};

PullRequest.prototype._pushBranchToRemote = function(branchName, remote, force, localPrefix) {
    this.promise = this.promise.then(function() {
        var refspec = 'refs/heads/' + PullRequest.PREFIX + localPrefix + branchName + ':refs/heads/' + branchName;
        if (force) {
            refspec = '+' + refspec;
        }
        console.log('Pushing from' + PullRequest.PREFIX + localPrefix + branchName + ' to ' + remote.name() + '/' + branchName);
        return remote.push([refspec], null, Git.Signature.default(this.repo), 'Push to ' + remote.name() + '/' + branchName);
    }.bind(this));
    return this.promise;
};

module.exports = PullRequest;
