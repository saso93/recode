const express = require('express');
const path = require('path');
const port = process.env.PORT || 8081;
const cors = require('cors');
const app = express();
const mysql = require('mysql');
const dbconfig = require('./Backend/database');
const bodyParser = require('body-parser');
const ConnessioneDB = require('./Backend/query');
const Filesaver = require('filesaver');
const fsPath = require('fs-path');
var nodegit = require('./node_modules/nodegit');
var promisify = require("promisify-node");
var fse = promisify(require("fs-extra"));
var fileName = "README.md";
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash    = require('connect-flash');
var morgan = require('morgan');
var jsonD = require('./concat.js')
var nomeUtente = "";

// *** DATABASE ***
// creiamo la connessione al database ed utilizziamo il db 'vit'
mysql.createConnection(dbconfig.connection);
ConnessioneDB.creaConnessione();
ConnessioneDB.usaDB();
app.use(session({
  resave: true,
	secret: 'stringacasualepercrittografareilcookie',
	saveUninitialized: true
 } ));
app.use(flash());
//SET APP
app.use(bodyParser.urlencoded({limit: '80mb', extended: true}));
app.use(bodyParser.json({limit: '80mb'}));
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.static(__dirname));
app.listen(port, function () {
});

//READ EJS ENGINE
app.set('view engine', 'ejs');

//GESTIONE COOKIE




//SET PAGINA INIZIALE
app.get('*', (req, res) => {
  //res.sendFile(path.resolve(__dirname, 'index.html'));
  if(!req.session.nickname){
    nomeUtente = "Guest";
  }
  else{
    nomeUtente = req.session.nickname;
  }
  res.render('index', {
    username: nomeUtente
});
});

// *** LATO BACKEND ***


// *** LOGOUT
app.post('/logout', function(req, res){
    req.session.destroy();
    res.send();
  });

// *** LOGIN
app.post('/login', function(req, res){

    ConnessioneDB.login(req,function(result){
     var messaggio = "";
      if (!result){
        messaggio = "Errore nel login!";
      }
      else{
        var messaggio = "Login ok!";
        req.session.nickname = result.nickname;
        req.session.mail = result.mail;

        if (req.body.remember) {
          req.session.cookie.maxAge = 1000 * 60 * 3;
        } else {
          req.session.cookie.expires = false;
        }
  
      
      }
      res.send(messaggio);
  });
});
/*
app.post('/login', function(req, res){
  console.log(req.session.nickname);
  ConnessioneDB.datiUtente(req,function(result){
    console.log(result.mail + "PIPPO");
    req.session.mail = result.mail;
    console.log(req.session.mail);
  });
});*/


//REGISTRAZIONE DAVGAB
app.post('/registrazione', function(req, res){
    ConnessioneDB.registrazione(req,function(result){
    var messaggio = "";
    if (!result){
      messaggio = "Errore nella registrazione";
    }
    else{
      var messaggio = "Registrazione ok ok!"
    }
    res.send(messaggio);
  });
});

app.post('/creaRepository', function (req, res) {
  var nomeRepository = req.body.nomeRepo;
  console.log(req.session.nickname + " REPO");
  console.log(req.session.mail);
  var d = new Date();
  var anno = d.getFullYear();
  var mese = d.getMonth()+1;
  var giorno = d.getDate();
  var ora = d.getHours();
  var minuto = d.getMinutes();
  var secondo = d.getSeconds();
  const dataCreazioneRepo = "'"+anno+"-"+mese+"-"+giorno+"'";
  ConnessioneDB.insertRepository(req, nomeRepository,dataCreazioneRepo, function(result){
  if (!result){
    messaggio = "Errore nell'inserimento repository";
  }
  else{
    var messaggio = "Repository inserita con successo"
  }
  res.send(messaggio);

  });

  ConnessioneDB.datiRepo(req,res, function(result){

  idRepository = result.idRepository;
  var pathR = "C:/Users/Davide/Desktop/Server/" + result.idRepository;
  ConnessioneDB.partecipazioneRepo(req, idRepository);
  var repoDir = pathR+"/.git";
  fse.ensureDir(path.resolve(__dirname, repoDir)).then(function() {
  //Inseriamo la repository sul DB

  //Creiamo la cartella .git all'interno della repository
  return nodegit.Repository.init(path.resolve(__dirname, repoDir), 0);
}).then(function(repo) {
  repository = repo;
  var fileContent = req.body.readme;
  
  //aggiungiamo il file README.MD all'interno della working directory
  return fse.writeFile(path.join(repository.workdir(), fileName), fileContent);
}).then(function(){
  return repository.refreshIndex();
})
.then(function(idx) {
  index = idx;
})
.then(function() {
  return index.addByPath(fileName);
})
.then(function() {
  return index.write();
})
.then(function() {
  return index.writeTree();
})
.then(function(oid) {
  var dataOdierna = new Date().getTime()/1000;

  //in author e in committer si scrive: nome, email, data, GMT
  //abbiamo scritto 120 in quanto è GMT +2 (i minuti in più rispetto al meridiano di Greenwich)
  var author = nodegit.Signature.create(req.session.nickname, req.session.mail,dataOdierna,120);

  var committer = nodegit.Signature.create(req.session.nickname, req.session.mail,dataOdierna,120);
  
  return repository.createCommit("HEAD", author, committer, "Readme creato", oid, []);
}).then(function(commitId){
  console.log("Commit: ",commitId);
});


//Quando si crea la repository, saranno create le cartelle (vuote inizialmente) IMMAGINI e JSON
var filesaver = new Filesaver({ safenames: true });

filesaver.folder('Immagini', pathR+"/Immagini", function (err, data) {
  if (err) {
    console.log("Errore " + err);
  }
req.session.branch = ConnessioneDB.branchMaster(req, res, result);
console.log(req.session.branch);
});

filesaver.folder('JSON', pathR+"/JSON", function (err, data) {
  if (err) {
    console.log("Errore " + err);
  }
  });
  });
}); 

app.post('/elencoRepo', function(req, res){
  ConnessioneDB.elencoRepo(req, function(result){
    
    res.send(result);
  })
});

app.post('/settaRepo', function(req,res){
  req.session.nameRepository = req.body.nomeRepo;
  ConnessioneDB.datiRepo(req,res, function(result){
    req.session.repository = "C:/Users/Davide/Desktop/Server/" + result.idRepository;
    req.session.idRepository = result.idRepository;
    res.write(res.toString(req.session.repository));
    
    ConnessioneDB.setIdBranchMaster(req,res, function(result){
      req.session.branch = result;
      res.write(res.toString(req.session.branch));
      res.end()
    });
  });
});


app.post('/addRevision', function(req, res){
  
  var nomedelfile = req.body.file_json_name;
  var dataFile = req.body.file_json_data;
  dataFile = jsonD.aggiustaOrderR(JSON.parse(dataFile));
  fsPath.writeFile(req.session.repository +'/JSON/'+ nomedelfile, JSON.stringify(dataFile, null, '\t'), function(err){
    if(err) {
      throw err;
    } else {
      console.log('Json fatto');
    }
  });

  
  var img = req.body.file_jpeg_data;
  var data = img.replace(/^data:image\/\w+;base64,/, "");
  var buf = new Buffer(data, 'base64');

 //JSON
  fsPath.writeFile(req.session.repository + '/Immagini/'+ req.body.file_jpeg_name, buf, function(err){
    if(err) {
      throw err;
    } else {
      console.log('Scritto JPEG');
    }
    
    var path = req.session.repository;


    
    var d = new Date();
    var anno = d.getFullYear();
    var mese = d.getMonth()+1;
    var giorno = d.getDate();
    const dataCreazioneRepo = "'"+anno+"-"+mese+"-"+giorno+"'"; 
  
    ConnessioneDB.datiRepo(req,res, function(result){
    ConnessioneDB.insertAddRevision(path, req, result.idRepository);
    

    });
  });

}); 
  
/*
Da save.js prendiamo il nome del file e andiamo a creare una cartella
sul desktop.. (è giusto un tentativo per dimostrare il passaggio da frontend
a backend tramite ajax)
*/
app.post('/branch', function(req,res){

  console.log("Hai creato il branch"+ req.body.nameBranch);

  ConnessioneDB.newBranch(req,res);
  
});
app.get('/branch', function(req,res){
  console.log("Ti sei spostato sul branch" + "Da fare");
  //Query di select del branch
});
// FINE MODIFICHE DAVIDE MANTELLINI

//INIZIO MODIFICHE COMMIT DM
app.post('/commit', function(req,res){
  fileName = req.body.file_json_name;
  fileData = req.body.file_json_data;
  var j1 = JSON.parse(fileData);;
  //INSERIRE QUI LA FUNZIONE diffJSON non appena avrò il caricamento file col REVG
  fsPath.writeFile(req.session.repository +'/JSON/'+ fileName, JSON.stringify(j1, null, '\t'), function(err){
    if(err) {
      throw err;
    } else {
      console.log('Json fatto');
    }
    ConnessioneDB.insertCommitFile(req,res);
    ConnessioneDB.saveCommit(req,res);
  });


})
//FINE MODIFICHE COMMIT DM

app.post('/elencoFile', function(req,res){
  

})


    module.exports = app;