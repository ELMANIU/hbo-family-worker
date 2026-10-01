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

url:
"https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.caa.mp4?u=0&b=0"

},



programacion:[


{
titulo:"SHREK",
duracion:5400,
url:"https://hugh.cdn.rumble.cloud/video/fwe2/44/s8/2/S/4/Q/2/S4Q2A.gaa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=1490550784-1490607269"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E01",
duracion:1320,
url:"https://hugh.cdn.rumble.cloud/video/fww1/8c/s8/2/a/2/R/2/a2R2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701743616-701757342"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E02",
duracion:1320,
url:"https://hugh.cdn.rumble.cloud/video/fww1/9a/s8/2/I/k/S/2/IkS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701710848-701724579"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E03",
duracion:1320,
url:"https://hugh.cdn.rumble.cloud/video/fww1/9f/s8/2/K/v/S/2/KvS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=696461312-696474940"
},


{
titulo:"TOM Y JERRY LA PELÍCULA",
duracion:4800,
url:"URL_TOM_JERRY"
},


{
titulo:"LOS CROODS",
duracion:5700,
url:"URL_LOS_CROODS"
}


]

}

};





const CONFIG =
CANALES[canal];



if(!CONFIG){

return new Response(
"Canal inexistente",
{status:404}
);

}




/*
==============================
HORA MÉXICO
==============================
*/


const mexico = new Date(

new Date()

.toLocaleString(
"en-US",
{
timeZone:"America/Mexico_City"
}

)

);



const reloj =
Math.floor(
mexico.getTime()/1000
);






/*
==============================
ARMAR PROGRAMACIÓN
COMERCIAL CADA 15 MIN
==============================
*/


let ciclo=[];

let contador=0;



for(const item of CONFIG.programacion){


ciclo.push(item);


contador += item.duracion;



while(contador >= 900){


ciclo.push(CONFIG.comercial);


contador -=900;


}


}






const duracionTotal =
ciclo.reduce(
(a,b)=>a+b.duracion,
0
);





let posicion =
reloj % duracionTotal;



let actual;



for(const item of ciclo){


if(posicion < item.duracion){

actual=item;

break;

}


posicion -= item.duracion;


}






/*
==============================
LISTA M3U
==============================
*/


if(url.pathname==="/"){


return new Response(

`#EXTM3U

#EXTINF:-1 tvg-id="hbo_family" tvg-name="HBO FAMILY HD",HBO FAMILY HD
${url.origin}/live.m3u8?canal=${canal}

`,

{

headers:{
"Content-Type":"application/x-mpegURL"
}

}

);

}





/*
==============================
HLS DINÁMICO
==============================
*/


if(url.pathname==="/live.m3u8"){



return new Response(

`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${actual.duracion}

#EXTINF:${actual.duracion},${actual.titulo}
${actual.url}

`,

{

headers:{

"Content-Type":
"application/vnd.apple.mpegurl",

"Cache-Control":
"no-cache"

}

}

);



}






/*
==============================
STATUS
==============================
*/


if(url.pathname==="/status"){


return new Response(

JSON.stringify({

canal:CONFIG.nombre,

ahora:actual.titulo,

restante:actual.duracion-posicion,

hora:mexico.toISOString()

},null,2),

{

headers:{
"Content-Type":"application/json"
}

}

);


}



return new Response(
"OK"
);


}

};
