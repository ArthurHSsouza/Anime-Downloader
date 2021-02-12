const {By, Builder} = require('selenium-webdriver');
const {Options} = require('selenium-webdriver/firefox');
const slugify = require('slugify');
const readLineSync = require('readline-sync');
const axios = require('axios');
const options = new Options().setBinary('C:/Program Files/Mozilla/Mozilla Firefox/firefox.exe');
const fs = require('fs');
let baseUrl = 'https://www.animesonline.cz/download/anime/';



function setDriver(){
    let driver = new Builder().setFirefoxOptions(options)
   .forBrowser('firefox').build();
    return driver;
}

 async function showEpisodes(url, driver){
    
    try{
        var err;
        await driver.get(url);
        var trArray = await driver.findElements(By.css('tbody > tr'));
        //Encontra o nome de todos os episódios e faz uma lista 
        console.log();
        for(let i=0; i < trArray.length; i++){
            let td = await trArray[i].findElement(By.css('td')).getText(); 
            td = td.replace("Download","");
            console.log(`${i+1} - ${td}`);
        }
        console.log(); 

    }catch{
        err = "Erro ao encontrar episódios disponíveis";
    }
    
    return new Promise((resolve, reject) =>{ 
         err ? reject(err) : resolve(trArray);
    });
}


async function getDownloadName(episode, episodeList, driver){
    
    try{

        var error;
        await episodeList[episode].findElement(By.css('.text-left > a')).click();
        let windowList = await driver.getAllWindowHandles();
        let newWindow = windowList[windowList.length-2];
        await  driver.close();
        await driver.switchTo().window(newWindow);
        await driver.sleep(11000);
        var fileDataName = await driver.findElement(By.css('.ptboxon > span > p')).getText();
        fileDataName = fileDataName.replace('Nome:',"").trim();
        console.log("Espere pelo inicio do download...");

    }catch{
       error = "Erro ao encontrar episódio";
       await driver.quit();
    }

    return new Promise((resolve, reject) => {
         error ? reject(error) : resolve(fileDataName);
    });
   }


 async function verifyAnime(title){

    var error;
    let url = baseUrl+title;
    try{
        var res = await axios.get(url);

    }catch{
        error = "Erro interno ao fazer consulta";
    }    

    return new Promise( 
        (resolve, reject)=>{
        if(url !== res.request.res.responseUrl){
            reject("Anime não encontrado ");
            return;
        }else{
            if(error){
                reject(error);
                return;
            }
        }
        resolve(url)
        console.log("Anime encontrado! ");
    });
}

async function download(filename, driver){
    
    let error;
    try{

        await driver.executeScript(`document.querySelector(".btn-danger").click()`);
        let windowList = await driver.getAllWindowHandles();
        await driver.switchTo().window(windowList[0]); 
        await driver.sleep(6000);
        let href = await driver.findElement(By.css('.botoes > a')).getAttribute('href');
        //await driver.quit();
        var res = await axios.get(href,{responseType: 'stream'});
        res.data.pipe(fs.createWriteStream(`./videos/${filename}.mp4`));

    }catch(err){
        console.log(err);
        error = "Erro ao acessar servidor de downloads";
    }

   return new Promise(

       (resolve, reject)=>{
            if(error){
                reject(error);
            }else{

                let bytes = 0;
                let totalSize = parseInt(Object.values(res.headers)[3]/1000000);

                try{
                res.data.on('end', ()=>{
                    resolve("Download finalizado!");
                }); 

                res.data.on('error', err=>{
                    reject(err);
                }); 

                res.data.on('data', chunk=>{
                   
                    let downloadedSize = parseInt((bytes+=chunk.length)/1000000);

                    console.log(`${downloadedSize}/${totalSize}MB baixados`);
                }); 

                }catch(err){
                    reject(err);
                }
           }
    }); 
        
    }

async function Main(){
    while(true){
        try{
            let anime = readLineSync.question("\n Digite o nome do anime: "); 
            let url = await verifyAnime(slugify(anime.toString()));
            let driver = setDriver();
            let episodeList = await showEpisodes(url, driver);
            let episode = readLineSync.question(`Digite o episodio: `);
            let fileName = await getDownloadName(episode-1, episodeList, driver); 
            let result = await download(fileName,driver);
            console.log(result);
        }catch(err){
            console.log(err);
        }
       }
}

Main();
        








    