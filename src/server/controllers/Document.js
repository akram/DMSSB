let Document = require('../models/Document');
let Client = require('../models/Client');
let path = require("path");
let randomstring = require("randomstring");
let fs = require("fs");
let fse = require("fs-extra");
let archiver = require('archiver');

module.exports.readPublishedDocuments = function(req, res, next) {
  Document.aggregate([{
    $match: {
      'flow.published': true
    }
  }, {
    $sort: {
      'publication.publicationDate': -1
    }
  }, {
    $limit: 30
  }], function(error, docs) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(docs);
  });
}

module.exports.downloadAllFiles = function(req, res, next) {
  Document.findOne({
    _id: req.params.id
  }, function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    let basePath = path.join(__dirname, `/../../../uploads/`);
    let fileName = `${doc.name}.zip`;

    var archive = archiver.create('zip', {});

    doc.files
      .filter((e) => e.published)
      .forEach((file) => {
        if (fs.existsSync(file.path)) {
          archive.file(file.path, {
            name: file.fileName
          });
        }
      });

    var output = fs.createWriteStream(`${basePath}/${fileName}`);

    output.on('close', function() {
      fs.unlink(`${basePath}${fileName}`);
    });

    output.on('error', function(error) {
      next(error);
      return res.send(error);
    });

    //set the archive name
    res.attachment(fileName);

    archive.pipe(res);

    archive.pipe(output);
    archive
    // .directory(`${basePath}${doc.name}`, false)
      .finalize();
  });
}

module.exports.downloadFile = function(req, res, next) {
  let file = unescape(req.params.path);

  let filename = path.basename(file);

  res.download(file, filename, (err) => {
    if (err) {
      console.log("ERROR:", err);
      res.status(500).json(err);
    }
  });
}

module.exports.updateHistoricFiles = function(req, res, next) {
  let doc;
  if (req.body.document) {
    doc = new Document(JSON.parse(req.body.document));
  } else {
    doc = new Document(req.body);
  }

  if (req.files) {
    req.files.forEach((e) => {
      doc.historicFiles.push({
        fileName: e.filename,
        path: e.path,
      });
    });
  }

  doc.historicFiles.forEach((file, index) => {
    if (!file.path.includes("\\history\\")) {
      let fileExt = file.fileName.slice((Math.max(0, file.fileName.lastIndexOf(".")) || Infinity) + 1);
      let newName = file.newFileName ? `${file.newFileName}.${fileExt}` : file.fileName;
      let newPath = file.path.replace(file.fileName, `history\\${newName}`);

      fse.moveSync(file.path, newPath, {
        overwrite: true
      });

      file.path = newPath;
      file.fileName = newName;
      delete file.newFileName;
      doc.historicFiles[index] = file;
    }
  });

  Document.update({
    _id: doc._id
  }, {
    $set: {
      files: doc.files,
      historicFiles: doc.historicFiles
    }
  }, function(error, result) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(doc);
  });
}

module.exports.updateFiles = function(req, res, next) {
  let doc = new Document(JSON.parse(req.body.document));
  let extras = JSON.parse(req.body.extras);

  req.files.forEach((e) => {
    let fileName = e.filename;
    if (e.filename.includes("-")) {
      let tempName = e.filename.substring(e.filename.indexOf("-") + 1, e.filename.length);
      if (extras[tempName]) {
        fileName = tempName;
      }
    }

    doc.files.push({
      fileName: e.filename,
      path: e.path,
      electronic: extras[fileName] ? extras[fileName].electronic : false,
      hd: extras[fileName] ? extras[fileName].hd : false,
      published: extras[fileName] ? extras[fileName].published : false //do condition if date
    });
  });

  doc.files.forEach((e) => {
    delete e["$hashKey"];
  });

  Document.update({
    _id: doc._id
  }, {
    $set: {
      approvals: doc.approvals,
      status: doc.status,
      flow: doc.flow,
      publication: doc.publication,
      request: doc.request,
      files: doc.files
    }
  }, function(error, result) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(doc);
  });
}

module.exports.create = function(req, res, next) {
  let doc = new Document(JSON.parse(req.body.document));
  let extras;
  if (req.body.extras) {
    extras = JSON.parse(req.body.extras);
  }

  doc.created = new Date();

  if (req.files) {
    req.files.forEach((e) => {
      let fileName = e.filename;
      if (e.filename.includes("-")) {
        let tempName = e.filename.substring(e.filename.indexOf("-") + 1, e.filename.length);
        if (extras[tempName]) {
          fileName = tempName;
        }
      }

      doc.files.push({
        fileName: e.filename,
        path: e.path,
        electronic: extras[fileName] ? extras[fileName].electronic : false,
        hd: extras[fileName] ? extras[fileName].hd : false,
        published: extras[fileName] ? extras[fileName].published : false //do condition if date
      });
    });
  }

  doc.save(function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(doc);
  });
}

module.exports.update = function(req, res, next) {
  Document.findOne({
    _id: req.params.id
  }, function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    for (prop in req.body) {
      doc[prop] = req.body[prop];
    }

    doc.save(function(error) {
      if (error) {
        res.status(500);
        next(error);
        return res.send(error);
      }

      res.json(doc);
    });
  });
}

module.exports.deleteFile = function(req, res, next) {
  Document.findOne({
    _id: req.params.id
  }, function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    for (let i = 0; i < doc.files.length; i++) {
      if (doc.files[i].fileName === req.params.name) {
        let deletedFiles = doc.files.splice(i, 1);

        deletedFiles.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    }

    Document.update({
      _id: doc._id
    }, {
      $set: {
        files: doc.files
      }
    }, function(error, result) {
      if (error) {
        res.status(500);
        next(error);
        return res.send(error);
      }

      res.json(doc);
    });
  });
}

module.exports.deleteHistoricFile = function(req, res, next) {
  Document.findOne({
    _id: req.params.id
  }, function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    for (let i = 0; i < doc.historicFiles.length; i++) {
      if (doc.historicFiles[i].fileName === req.params.name) {
        let deletedhistoricFiles = doc.historicFiles.splice(i, 1);

        deletedhistoricFiles.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    }

    Document.update({
      _id: doc._id
    }, {
      $set: {
        historicFiles: doc.historicFiles
      }
    }, function(error, result) {
      if (error) {
        res.status(500);
        next(error);
        return res.send(error);
      }

      res.json(doc);
    });
  });
}

module.exports.delete = function(req, res, next) {
  Document.update({
    _id: req.params.id
  }, {
    $set: {
      status: 'Anulado'
    }
  }, function(error, result) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(result);
  });
}

module.exports.find = function(req, res, next) {
  Document.findOne({
    _id: req.params.id
  }, function(error, doc) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(doc);
  });
}

module.exports.findMyDocuments = function(req, res, next) {
  Document.find({
    'createdBy._id': req.params.id
  }, function(error, docs) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(docs);
  });
}

module.exports.findPendingDocuments = function(req, res, next) {
  Client.findOne({
    _id: req.params.id
  }, function(error, client) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    Document.find({
      $and: [{
        $or: [{
          "status": {
            $ne: "Anulado"
          }
        }, {
          "status": {
            $ne: "Publicado"
          }
        }, {
          "flow.readyToPublish": true
        }]
      }, {
        business: {
          $in: client.business
        }
      }]
    }, function(error, docs) {
      if (error) {
        res.status(500);
        next(error);
        return res.send(error);
      }

      docs = docs.filter((doc) => {
        return checkDocument(doc, client).canApprove;
      });

      res.json(docs);
    });
  });
}

module.exports.findAndCheckDocument = function(req, res, next) {
  Client.findOne({
    _id: req.params.clientId
  }, function(error, client) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    Document.findOne({
      _id: req.params.docId
    }, function(error, doc) {
      if (error) {
        res.status(500);
        next(error);
        return res.send(error);
      }

      res.json({
        document: doc,
        approval: checkDocument(doc, client)
      });
    });
  });
}

module.exports.updateApprovals = function(req, res, next) {
  Document.update({
    _id: req.params.id
  }, {
    $set: {
      approvals: req.body.approvals,
      status: req.body.status,
      flow: req.body.flow,
      publication: req.body.publication,
      request: req.body.request,
      files: req.body.files,
      expiredDate: req.body.expiredDate
    }
  }, function(error, result) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    res.json(result);
  });
}

module.exports.search = function(req, res, next) {

  for (var key of Object.keys(req.body)) {
    if (req.body[key] === '') {
      req.body[key] = null;
    }
  }

  Document.find({
    'flow.published': true
  }, function(error, docs) {
    if (error) {
      res.status(500);
      next(error);
      return res.send(error);
    }

    if (req.body.code) {
      docs = docs.filter((doc) => {
        return doc.publication.code.includes(req.body.code);
      });
    }
    if (req.body.name) {
      docs = docs.filter((doc) => {
        return doc.name.includes(req.body.name);
      })
    }
    if (req.body.status) {
      docs = docs.filter((doc) => {
        return doc.status === req.body.status;
      })
    }
    if (req.body.department) {
      docs = docs.filter((doc) => {
        return doc.department === req.body.department;
      })
    }
    if (req.body.business) {
      docs = docs.filter((doc) => {
        return doc.business === req.body.business;
      })
    }
    if (req.body.docType) {
      docs = docs.filter((doc) => {
        return doc.type.type === req.body.docType;
      })
    }

    res.json(docs);
  });
}

function checkDocument(doc, client) {
  let includesDoc = false;
  let step = -1;

  if (doc.flow.readyToPublish && client.documentaryCenterAdmin) {
    return {
      canApprove: true,
      step: step,
      publicationStep: true
    };
  }

  if (doc.type.blueprint && !doc.flow.blueprintApproved) {
    includesDoc = doc.implication && doc.implication.authorization[doc.business] ? doc.implication.authorization[doc.business].map(a => a._id).includes(client._id.toString()) : false;

    return {
      canApprove: includesDoc,
      step: step,
      blueprint: true
    };
  }

  if (doc.request && doc.request[doc.business]) {
    for (var i = 0; i < doc.request[doc.business].length; i++) {
      let currentStep = doc.request[doc.business][i];
      let previousStep = null;
      step = i;

      if (i - 1 >= 0) {
        previousStep = doc.request[doc.business][i - 1];
      }

      //If the document does not  require safety env and the step includes it, then skips it
      if (!doc.requiresSafetyEnv && currentStep.forEnvironment) {
        continue;
      }

      //If the previous step is not approved yet... then cut the loop
      if ((previousStep && !previousStep.approved)) {
        if (!(previousStep.forEnvironment && !doc.requiresSafetyEnv)) {
          break;
        }
      }

      if (currentStep.requiresDept) {
        if (doc.department === client.department)
          includesDoc = currentStep.approvals[doc.department].map(e => e._id).includes(client._id.toString()) && !currentStep.approved;
      } else {
        includesDoc = currentStep.approvals.map(e => e._id).includes(client._id.toString()) && !currentStep.approved;
      }

      if (includesDoc) {
        break;
      }
    }
  }


  return {
    canApprove: includesDoc,
    step: step,
    blueprint: false
  };
}
