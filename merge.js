var Git = require('nodegit');
var fs = require('fs');
var path = require('path');

module.exports = function(organization, repositoryName) {
    var repoPath = 'repos/' + organization + '/' + repositoryName,
        localPath = path.join(__dirname, repoPath),
        alreadyCloned = verifyIsGitRepository(localPath),
        cloneOptions = {},
        repoPromise;

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
        repoPromise = Git.Clone.clone('git@github.com:' + organization + '/' + repositoryName + '.git', localPath, cloneOptions);
    }
    repoPromise.then(function(repo) {
        console.log('finished');
    }, function(error) {
        console.log('error');
        console.log(error);
    });

};

function verifyIsGitRepository(localPath) {
    try {
        var stats = fs.lstatSync(localPath + '/.git');
        return stats.isDirectory();
    } catch(e) {
        console.log(e);
        return false;
    }
}

module.exports('jrbalsano', 'dummyRepo');
