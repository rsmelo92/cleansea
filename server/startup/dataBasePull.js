import schedule from 'node-schedule';
import PDFParser from 'pdf2json';
import fs from 'fs';

moment.locale('pt-br');
moment.tz.setDefault('America/Bahia');

Meteor.startup(function () {
    console.log("Teste de startup");
    
    // Schedule Reference
    // -------------------------------------------------
    // *    *    *    *    *    *
    // ┬    ┬    ┬    ┬    ┬    ┬
    // │    │    │    │    │    |
    // │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
    // │    │    │    │    └───── month (1 - 12)
    // │    │    │    └────────── day of month (1 - 31)
    // │    │    └─────────────── hour (0 - 23)
    // │    └──────────────────── minute (0 - 59)
    // └───────────────────────── second (0 - 59, OPTIONAL)

    // Daily automatic request from government database
    let pullDB = schedule.scheduleJob('00 00 12 * * *', Meteor.bindEnvironment(function () {
        
        let pdfParser         = new PDFParser(this,1),
            arrayPraias       = [],
            arrayInfoPraias   = [],
            jsonA             = {},
            hoje              = moment().format('DD-MM-YYYY'),
            hoje2             = moment().format('DD_MM_YYYY'),
            changeNumber      = 0,
            idEmitido         = Emitido.findOne(),
            pdfBuffer, temp, temp2, temp3, temp4, data;

        function responseTest(){
            let ultimoBoletim   = idEmitido.ultimoBoletim,
                novoBoletim;
                
                console.log("ultimoBoletim", ultimoBoletim);

                ultimoBoletim   = parseInt(ultimoBoletim);
                novoBoletim     = ultimoBoletim + 1;
                novoBoletim     = novoBoletim.toString();

                console.log("novoBoletim", novoBoletim);

            console.log("http://www.inema.ba.gov.br/wp-content/uploads/2011/08/Boletim-N"+novoBoletim+"-Balneabilidade-para-Salvador-emitido-em-"+hoje+".pdf")
            pdfBuffer = HTTP.call('GET', "http://www.inema.ba.gov.br/wp-content/uploads/2011/08/Boletim-N"+novoBoletim+"-Balneabilidade-para-Salvador-emitido-em-"+hoje+".pdf", { encoding: 'binary', responseType: 'buffer' }, function(error, response){
                console.log("pdfBuffer", response);
                if (error) {
                    console.log("error!", error)
                }
                else if (response && response.statusCode === 200) {
                    console.log("foi pdfBuffer.content:", response.content);
                    console.log("idEmitido.ultimoBoletim", idEmitido.ultimoBoletim);
                    console.log("url ultimoBoletim", novoBoletim);

                    Emitido.update({_id:idEmitido._id}, { $set:{ultimoBoletim:novoBoletim} });
                    
                    pdfBuffer = response.content;
                    arrayMaker(pdfBuffer);
                
                }
                else{
                    console.log("Não foi");
                    return;
                }

            });
        }

        responseTest();
        
        function arrayMaker(pdfBuffer){
        
        console.log("****RESPONSE", pdfBuffer);

        fs.writeFileSync("file.pdf", pdfBuffer, 'binary');

        pdfParser.on("pdfParser_dataError", Meteor.bindEnvironment(function(errData){console.error('**error:',errData.parserError) }) );
        
        pdfParser.on("pdfParser_dataReady", Meteor.bindEnvironment(function(pdfData) {
 
            fs.writeFileSync("./QualidadePraias.txt", pdfParser.getRawTextContent());
            
            console.log("writeFile arrayMaker");
                
            // ArrayMaker
            let array = fs.readFileSync('QualidadePraias.txt').toString().split("\n");
                data  = array[3].substring(array[3].indexOf("Emitido")).replace('\r','');

            console.log("data: ", data);

            arrayPraias.push(data);

            for (let i = 5; i <= 43; i++) {
                // console.log("Loop")
                if (i===34) {
                    // console.log("34 Escape")
                }
                else{
                    // console.log("operation")
                    temp = array[i].substring(0,array[i].indexOf("-")-1);

                    if (array[i].indexOf("Imprópria")>0) {
                        temp2 = array[i].substring(array[i].indexOf("Imprópria")).replace(/(\r\n|\n|\r)/gm,"");
                        temp3 = array[i].substring(array[i].indexOf("00")+2, array[i].indexOf("Imprópria"));
                        temp4 = array[i].substring(array[i].indexOf("-")+2, array[i].indexOf("00")+2);
                    }
                    if (array[i].indexOf("Própria")>0) {
                        temp2 = array[i].substring(array[i].indexOf("Própria")).replace(/(\r\n|\n|\r)/gm,"");
                        temp3 = array[i].substring(array[i].indexOf("00")+2, array[i].indexOf("Própria"));
                        temp4 = array[i].substring(array[i].indexOf("-")+2, array[i].indexOf("00")+2);
                    }
                    arrayPraias.push({Praia: temp, Qualidade: temp2, Local: temp3, Codigo: temp4});
                }
            }
            jsonPull = {"array":arrayPraias};

            arrayPraias = [];
     
            // PopulateBD
            jsonPull.array.forEach(function(item, index){
                if (index === 0) {
                    if ( idEmitido ) {
                        Emitido.update({_id:idEmitido._id},
                                    {
                                        $set: {
                                            emitido: jsonPull.array[0]
                                        }
                                    }
                        );                        
                    }
                    else{ 
                        Emitido.insert({emitido:jsonPull.array[0]});
                    }
                }
                else{
                    if (Praias.findOne({codigo:item.Codigo})) {

                        Praias.update({codigo:item.Codigo},
                                    {
                                        $set: {
                                            codigo: item.Codigo, 
                                            praia:item.Praia,
                                            qualidade: item.Qualidade,
                                            local: item.Local
                                        }
                                    }
                        );
                    }
                    else{
                        
                        Praias.insert({
                                        codigo: item.Codigo, 
                                        praia:item.Praia,
                                        qualidade: item.Qualidade,
                                        local: item.Local
                                      });
                    }

                }
            });

        }) );

        pdfParser.loadPDF("file.pdf");
    }
        
    }));
});