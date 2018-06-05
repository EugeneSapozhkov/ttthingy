var models = ['./tokens.js', './users.js'];

exports.initialize = function () {
    var l = models.length;
    for (var i = 0; i < l; i++) {
        require(models[i]);
    }
};