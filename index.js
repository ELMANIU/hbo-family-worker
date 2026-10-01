export default {

async fetch(request, env) {


const url = new URL(request.url);

const canal =
url.searchParams.get("canal") || "hbo_family";



const CANALES = {


hbo_family:{


nombre:"HBO FAMILY HD",


comercial:{

titulo:"PROMO HBO FAMILY",

duracion:90,

tipo:"mp4",

url:
"https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.caa.mp4?u=0&b=0"

},



programacion:[


{
titulo:"SHREK",
duracion:5400,
tipo:"m3u8",
url:
"https://hugh.cdn.rumble.cloud/video/fwe2/44/s8/2/S/4/Q/2/S4Q2A.gaa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=1490550784-1490607269"
},



{
titulo:"LAS CHICAS SUPERPODEROSAS - T1 E01",
duracion:1320,
tipo:"m3u8",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/8c/s8/2/a/2/R/2/a2R2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701743616-701757342"
},



{
titulo:"LAS CHICAS SUPERPODEROSAS - T1 E02",
duracion:1320,
tipo:"m3u8",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9a/s8/2/I/k/S/2/IkS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701710848-701724579"
},



{
titulo:"LAS CHICAS SUPERPODEROSAS - T1 E03",
duracion:1320,
tipo:"m3u8",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9f/s8/2/K/v/S/2/KvS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=696461312-696474940"
}



]


},




fenix_premiere:{


nombre:"FENIX PREMIERE HD",


comercial:{

titulo:"PROMO FENIX PREMIERE",

duracion:90,

tipo:"mp4",

url:"URL_PROMO_FENIX"

},


programacion:[]

},




fenix_mix:{


nombre:"FENIX MIX HD",


comercial:{

titulo:"PROMO FENIX MIX",

duracion:90,

tipo:"mp4",

url:"URL_PROMO_MIX"

},


programacion:[]

}



};






const CONFIG =
CANALES[canal];



if(!CONFIG){


return new Response(

"Canal no existe",

{
status:404
}

);

}







/*
================================
HORA MÉXICO
================================
*/


const mexico =

new Date(

new Date()

.toLocaleString(

"en-US",

{

timeZone:
"America/Mexico_City"

}

)

);





const tiempo =

Math.floor(

mexico.getTime()/1000

);







/*
================================
CREAR CICLO DEL CANAL
COMERCIAL CADA 15 MINUTOS
================================
*/


let ciclo=[];


let contador=0;



for(const item of CONFIG.programacion){


ciclo.push(item);



contador += item.duracion;




while(contador >= 900){


ciclo.push(CONFIG.comercial);


contador -= 900;


}


}






const duracionTotal =

ciclo.reduce(

(total,item)=>

total + item.duracion,

0

);







/*
================================
POSICIÓN ACTUAL
================================
*/


let posicion =

tiempo %

duracionTotal;




let actual=null;




for(const item of ciclo){


if(posicion < item.duracion){


actual=item;

break;

}


posicion -= item.duracion;


}






if(!actual){

actual=ciclo[0];

}







return new Response(

JSON.stringify(

{

canal:CONFIG.nombre,

titulo:actual.titulo,

duracion:actual.duracion,

tipo:actual.tipo,

url:actual.url,

offset:posicion,

hora_mexico:mexico.toISOString()

},

null,

2

),

{


headers:{

"Content-Type":

"application/json",


"Cache-Control":

"no-cache"

}


}

);




}

};
