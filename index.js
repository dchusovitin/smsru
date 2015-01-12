'use strict';


var http = require('http');
var crypto = require('crypto');


function formatParams(params) {
    var result = [];


    Object.keys(params).forEach(function (key) {
        result.push(key + '=' + params[key]);
    });

    return result.join('&');
}

var merge = function () {
    var obj = {},
        i = 0,
        il = arguments.length,
        key;
    for (; i < il; i++) {
        for (key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                obj[key] = arguments[i][key];
            }
        }
    }
    return obj;
};

SmsRu.prototype.curl = function (method, params, callback) {
    var url = 'http://sms.ru' + method + '?' + formatParams(merge(this.auth, params));
    http.get(url, function(res){
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.once('end', function () {
            var chunked = body.split("\n");
            callback(null, parseInt(chunked[0], 10), chunked, body);
        });
        res.once('error', function (err) {
            callback(err);
        });
    });
};


SmsRu.prototype.cost = function (params, callback) {

    this.curl("/sms/cost", params, function (err, resultCode, chunked) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null, parseFloat(chunked[1]), parseInt(chunked[2]));
    });
};

SmsRu.prototype.balance = function (callback) {

    this.curl("/my/balance", {}, function (err, resultCode, chunked) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null, parseFloat(chunked[1]));
    });
};


SmsRu.prototype.check = function (callback) {
    this.curl("/auth/check", {}, function (err, resultCode) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null);
    });
};

SmsRu.prototype.limit = function (callback) {

    this.curl("/my/limit", {}, function (err, resultCode, chunked) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null, parseInt(chunked[1]), parseInt(chunked[2]));
    });
};

SmsRu.prototype.senders = function (callback) {

    this.curl("/my/senders", {}, function (err, resultCode, chunked) {
        if (err) {
            callback(err);
        }if (resultCode !== 100) {
            callback(new Error(resultCode));
        } else {
            callback(null, chunked.slice(1));

        }
    });
};

SmsRu.prototype.send = function (params, callback) {
    
    if (params.time) params.time = ((new Date().getTime() + isNaN(params.time) ? params.time : 0) / 1000).toFixed();
    
    this.curl("/sms/send", params, function (err, resultCode, chunked) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null, chunked[1]);
    });
};

SmsRu.prototype.status = function (id, callback) {
    this.curl("/sms/status", {
        id: id
    }, function (err, resultCode) {
        if (err)
            return callback(err);
        if (resultCode < 100 || resultCode > 103)
            return callback(new Error(resultCode));
        callback(null, resultCode);
    });
};


SmsRu.prototype.stoplistAdd = function (params, callback) {
    
    
    this.curl("/stoplist/add", {
        stoplist_phone: params.phone,
        stoplist_text: params.reason?params.reason:''
    }, function (err, resultCode) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null);
    });
};


SmsRu.prototype.stoplistDel = function (params, callback) {
    var obj = {};
    if (typeof params === 'object' && params.phone) {
        obj.phone = params.phone;
    } else {
        obj.phone = params;
    }

    this.curl("/stoplist/del", {
        stoplist_phone: obj.phone
    }, function (err, resultCode) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        callback(null);
    });
};

var formatStopList = function (data, callback) {
    var obj = [];
    data.slice(1).forEach(function (elem) {
        var sp = elem.split(';');
        obj.push({ phone: sp[0], reason: sp[1] });

    });
    callback(null, obj, data[0]);
};

SmsRu.prototype.stoplist = function (callback) {

    this.curl("/stoplist/get", {}, function (err, resultCode, chunked) {
        if (err)
            return callback(err);
        if (resultCode !== 100)
            return callback(new Error(resultCode));
        formatStopList(chunked, callback);
    });
};


function SmsRu(opt) {
    var self = this;
    this.api_id = opt.api_id;
 
    if (opt.login && opt.password) {
        this.login = opt.login;
        this.password = opt.password;

        this.token(function (err, token) {
            if (!err) {
                self.auth = { login: self.login, token: token, sha512: crypto.createHash('sha512').update(self.password + token + (!self.api_id ? '' : self.api_id)).digest("hex") };
            }            
        });
        
        
        //we need to get token every 10 minutes
        if (opt.autoToken === undefined || opt.autoToken === true) {
            setInterval(function () {
           
                self.token(function (err, token) {
                
                    if (!err) {
                        self.auth = { login: self.login, token: token, sha512: crypto.createHash('sha512').update(self.password + token + (!self.api_id ? '' : self.api_id)).digest("hex") };
                    }

                });
            }, 10 * 60 * 1000);
        }
    }
    else if (opt.api_id) {
        this.auth = { api_id: opt.api_id };
    }    
}


SmsRu.prototype.token = function(callback){
    this.curl('/auth/get_token', {}, 
    function(err, resultCode, chunked){
        if(err)
            return callback(err);
        callback(null, chunked[0]);
    });
};

module.exports = SmsRu;
