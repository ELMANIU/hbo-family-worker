// HBO FAMILY WORKER
// Canal HLS lineal 24/7
// Peliculas + Series + Comercial


const WORKER_VERSION = "1.0.0";


// =========================
// CONTENIDO
// =========================


const CANALES = {

hbo_family:{


nombre:"HBO FAMILY HD",

descripcion:
"Películas y series familiares 24/7",


epoch:
Date.UTC(2026,0,1,0,0,0)/1000,


intervaloComercialesMinutos:15,

comercialEntreProgramas:true,



programas:[


{
nombre:"SHREK",
tipo:"pelicula",
url:
"https://hugh.cdn.rumble.cloud/video/fwe2/44/s8/2/S/4/Q/2/S4Q2A.gaa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=1490550784-1490607269"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E01",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/8c/s8/2/a/2/R/2/a2R2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701743616-701757342"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E02",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9a/s8/2/I/k/S/2/IkS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701710848-701724579"
},



{
nombre:"LAS CHICAS SUPERPODEROSAS T1 E03",
tipo:"serie",
url:
"https://hugh.cdn.rumble.cloud/video/fww1/9f/s8/2/K/v/S/2/KvS2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=696461312-696474940"
},



{
nombre:"TOM Y JERRY LA PELÍCULA",
tipo:"pelicula",
url:"PON_AQUI_LINK_TOM_JERRY"
},



{
nombre:"LOS CROODS",
tipo:"pelicula",
url:"PON_AQUI_LINK_CROODS"
}


],



comerciales:[


{
nombre:"PROMO HBO FAMILY",
tipo:"comercial",
url:
"https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.caa.mp4",
maxDurationSeconds:90
}


]

}


};




// =========================
// CONFIG HLS
// =========================


const SEGMENTOS_ATRAS = 10;
const SEGMENTOS_ADELANTE = 12;



let cacheSchedule=null;



// =========================
// CARGAR M3U8
// =========================


async function cargarPlaylist(url){


const r = await fetch(url);

const txt = await r.text();


return txt.split("\n")

.filter(x=>x && !x.startsWith("#EXT-X-ENDLIST"))

}


async function construirHorario(){


let lista=[];


const canal=CANALES.hbo_family;



for(const programa of canal.programas){


lista.push({

...programa,

duracion:3600

});



// comercial cada bloque

lista.push({

...canal.comerciales[0],

duracion:90

});


}



return lista;

}




function tiempoActual(){


return Math.floor(Date.now()/1000);

}





// =========================
// GENERADOR PLAYLIST
// =========================


async function generarM3U8(){


const horario =
await construirHorario();



let total=0;


for(const x of horario)

total+=x.duracion;



let pos =
tiempoActual() %
total;



let actual;



for(const item of horario){


if(pos < item.duracion){

actual=item;

break;

}


pos-=item.duracion;


}



if(!actual)

actual=horario[0];



let segmentos =
await cargarPlaylist(actual.url);



let salida=[

"#EXTM3U",

"#EXT-X-VERSION:3",

"#EXT-X-TARGETDURATION:10",

"#EXT-X-MEDIA-SEQUENCE:0"

];



let contador=0;



for(const seg of segmentos){


if(seg.startsWith("#"))

salida.push(seg);

else{


salida.push(seg);

contador++;


if(contador>SEGMENTOS_ADELANTE)

break;


}


}



return salida.join("\n");


}





// =========================
// WORKER
// =========================



export default {


async fetch(request){


const url=new URL(request.url);



if(url.pathname==="/"){


return new Response(

JSON.stringify({

servicio:"HBO FAMILY WORKER",

version:WORKER_VERSION,

live:
url.origin+"/hbo_family/live.m3u8"

},null,2),

{

headers:{
"content-type":"application/json"
}

}

);

}




if(url.pathname==="/hbo_family/live.m3u8"){



const playlist =
await generarM3U8();



return new Response(

playlist,

{

headers:{

"content-type":
"application/vnd.apple.mpegurl",

"cache-control":
"no-cache,no-store"

}

}

);


}





return new Response(

"Ruta no encontrada",

{status:404}

);


}


};
