const WORKER_VERSION = "HBO-FAMILY-1.1.0";


const CANALES = {

hbo_family:{


nombre:"HBO FAMILY HD",


descripcion:
"Peliculas y series familiares 24/7",


epoch:
Date.UTC(2026,0,1,0,0,0)/1000,


intervaloComercialesMinutos:15,



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
}


],



comerciales:[


{

nombre:"PROMO HBO FAMILY",

tipo:"comercial",

url:
"https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.aaa.ts",

maxDurationSeconds:90

}


]

}

};





const SEGMENTOS_ADELANTE = 12;

let CACHE=null;



// =======================
// CARGADOR HLS + TS
// =======================


async function cargarContenido(item){



// Si es TS directo

if(item.url.endsWith(".ts")){


return {

item,

segmentos:[

{

url:item.url,

duracion:item.maxDurationSeconds || 90

}

],

duracion:item.maxDurationSeconds || 90

};


}




const r =
await fetch(item.url);



if(!r.ok)

throw new Error(
"Error cargando "+item.nombre
);



const texto =
await r.text();



const base =
new URL(item.url);



let segmentos=[];

let duracion=0;

let pendiente=0;



for(
let linea of texto.split("\n")
){


linea=linea.trim();



if(
linea.startsWith("#EXTINF")
){

pendiente=
parseFloat(
linea.split(":")[1]
);


}



if(
linea &&
!linea.startsWith("#")
&& pendiente
){


segmentos.push({

url:
new URL(
linea,
base
).href,

duracion:
pendiente

});


duracion+=pendiente;


pendiente=0;


}


}



return {

item,

segmentos,

duracion

};


}






async function crearHorario(){


let lista=[];


const canal =
CANALES.hbo_family;



for(
const programa of canal.programas
){


lista.push(
await cargarContenido(programa)
);



}


// insertar comerciales cada 15 minutos

let salida=[];


let tiempo=0;



for(
const bloque of lista
){


salida.push(bloque);



tiempo+=bloque.duracion;



if(
tiempo >= 900
){


salida.push(

await cargarContenido(
canal.comerciales[0]
)

);


tiempo=0;


}



}



return salida;


}







async function horario(){


if(!CACHE)

CACHE =
await crearHorario();



return CACHE;


}







function obtenerActual(lista){



let total=0;


for(
const x of lista
)

total+=x.duracion;



let reloj =
Math.floor(
Date.now()/1000
);



let posicion =
(
reloj -
CANALES.hbo_family.epoch
)
% total;



let acumulado=0;



for(
const bloque of lista
){



if(
posicion <
acumulado+bloque.duracion
){


return {

bloque,

offset:
posicion-acumulado

};


}



acumulado+=bloque.duracion;


}



return {

bloque:
lista[0],

offset:0

};


}







function generarM3U8(lista){



const actual =
obtenerActual(lista);



let segs =
actual.bloque.segmentos;



let inicio=0;


let tiempo=0;



while(
tiempo+
segs[inicio].duracion
<
actual.offset
){


tiempo+=
segs[inicio].duracion;


inicio++;


if(
inicio>=segs.length
)

inicio=0;


}



let salida=[

"#EXTM3U",

"#EXT-X-VERSION:3",

"#EXT-X-TARGETDURATION:10",

"#EXT-X-MEDIA-SEQUENCE:0"

];





for(
let i=0;
i<SEGMENTOS_ADELANTE;
i++
){



const seg =
segs[inicio];



salida.push(
"#EXTINF:"+
seg.duracion+
","
);


salida.push(
seg.url
);



inicio++;



if(
inicio>=segs.length
)

break;


}



return salida.join("\n");

}







export default {


async fetch(request){


const url =
new URL(request.url);



try{


if(
url.pathname==
"/"
){


return new Response(

JSON.stringify({

service:"HBO FAMILY HD",

version:
WORKER_VERSION,

live:
url.origin+
"/hbo_family/live.m3u8"

},null,2),

{

headers:{
"content-type":
"application/json"
}

}

);


}




if(
url.pathname==
"/hbo_family/live.m3u8"
){


const lista =
await horario();



return new Response(

generarM3U8(lista),

{

headers:{

"content-type":
"application/vnd.apple.mpegurl",

"cache-control":
"no-cache"

}

}

);


}




if(
url.pathname==
"/hbo_family/status"
){


const lista =
await horario();


const actual =
obtenerActual(lista);



return new Response(

JSON.stringify({

canal:"HBO FAMILY HD",

ahora:
actual.bloque.item.nombre,

offset:
actual.offset

},null,2),

{

headers:{
"content-type":
"application/json"
}

}

);


}



return new Response(
"OK"
);



}

catch(e){


return new Response(

JSON.stringify({

error:e.message

},null,2),

{

status:500,

headers:{
"content-type":
"application/json"
}

}

);


}



}


};
