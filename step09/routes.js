/*
 Copyright 2016 Google, Inc.

 Licensed to the Apache Software Foundation (ASF) under one or more contributor
 license agreements. See the NOTICE file distributed with this work for
 additional information regarding copyright ownership. The ASF licenses this
 file to you under the Apache License, Version 2.0 (the "License"); you may not
 use this file except in compliance with the License. You may obtain a copy of
 the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 License for the specific language governing permissions and limitations under
 the License.
 */

'use strict';

var express = require('express');
var router = express.Router();
var models = require('./models');
var Sequelize = require('sequelize');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser());

router.get('/', function(req, res, next) {
	var options = {
		order : [['createdAt', 'DESC']]
	};
	var options1 = {
		order : [['sitelisting', 'ASC']]
	};
	Sequelize.Promise.all([models.Siterecords.findAll(options1), models.Spreadsheet.findAll(options)]).then(function(results) {
		res.render('index', {
			siterecord : results[0],
			spreadsheets : results[1]
		});
	});
});
router.get('/delete/:sitelisting', function(req, res, next) {
	models.Siterecords.findById(req.params.sitelisting).then(function(order) {
		if (!order) {
			throw new Error('Order not found: ' + req.params.id);
		}
		return order.destroy();
	}).then(function() {
		res.redirect('/');
	}, function(err) {
		next(err);
	});
});





router.get('/sitelistinsert', function(req, res, next) {
	res.render('sitelisttextaraea');
});




router.get('/create', function(req, res, next) {
	res.render('listedit');
});

router.get('/edit/:sitelisting', function(req, res, next) {
	models.Siterecords.findById(req.params.sitelisting).then(function(Siterecords) {
		if (Siterecords) {
			res.render('listedit', {
				Siterecords : Siterecords
			});
		} else {
			next(new Error('Order not found: ' + req.params.id));
		}
	});
});

router.get('/', function(req, res, next) {
	var options = {
		order : [['createdAt', 'DESC']]
	};
	var options1 = {
		order : [['sitelisting', 'ASC']]
	};
	Sequelize.Promise.all([models.Siterecords.findAll(options1), models.Spreadsheet.findAll(options)]).then(function(results) {
		res.render('index', {
			siterecord : results[0],
			spreadsheets : results[1]
		});
	});
});

router.post('/upsert', function(req, res, next) {
	models.Siterecords.upsert(req.body).then(function() {
		res.redirect('/');
	}, function(err) {
		next(err);
	});
});

router.post('/savesites', function(req, res, next) {
	var eachsite = req.body.siteURL;
	var nolines = eachsite.split("\r");
	console.log("successs" + nolines[3]);
	for (var i = 0; i < nolines.length; i++) {
		models.Siterecords.upsert({
			siteURL : nolines[i],
			sitelisting : i + 1
		})
	}
	res.render('codeupdate');
}, function(err) {
	next(err);
});

router.post('/savescript', function(req, res, next) {
	var scriptassoc = req.body.scriptUsed;
	var nolines = scriptassoc;
	models.Siterecords.upsert({
		siteURL : nolines
	})
	res.redirect('/sitelistinsert');
}, function(err) {
	next(err);
});

var SheetsHelper = require('./sheets');

router.post('/spreadsheets', function(req, res, next) {
	var auth = req.get('Authorization');
	if (!auth) {
		return next(Error('Authorization required.'));
	}
	var accessToken = auth.split(' ')[1];
	var helper = new SheetsHelper(accessToken);
	var title = 'DataCollection (' + new Date().toLocaleTimeString() + ')';
	helper.createSpreadsheet(title, function(err, spreadsheet) {
		if (err) {
			return next(err);
		}
		var model = {
			id : spreadsheet.spreadsheetId,
			sheetId : spreadsheet.sheets[0].properties.sheetId,
			name : spreadsheet.properties.title
		};
		models.Spreadsheet.create(model).then(function() {
			return res.json(model);
		});
	});
});
// Route for syncing spreadsheet.

router.post('/spreadsheets/:id/sync', function(req, res, next) {
	var auth = req.get('Authorization');
	if (!auth) {
		return next(Error('Authorization required.'));
	}
	var accessToken = auth.split(' ')[1];
	var helper = new SheetsHelper(accessToken);

	Sequelize.Promise.all([models.Spreadsheet.findById(req.params.id), models.Siterecords.findAll()]).then(function(results) {
		var spreadsheet = results[0];
		var Siterecords = results[1];
		helper.sync(spreadsheet.id, spreadsheet.sheetId, Siterecords, function(err) {
			if (err) {
				return next(err);
			}
			return res.json(Siterecords.length);
		});
	});
});

module.exports = router;
