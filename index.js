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
url:"URL_SHREK"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E01",
duracion:1320,
url:"URL_E01"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E02",
duracion:1320,
url:"URL_E02"
},


{
titulo:"LAS CHICAS SUPERPODEROSAS T1 E03",
duracion:1320,
url:"URL_E03"
},


{
titulo:"TOM Y JERRY LA PELÍCULA",
duracion:4800,
url:"URL_TOM_JERRY"
},


{
titulo:"LOS CROODS",
duracion:5700,
url:"URL_CROODS"
}


]

},




fenix_premiere:{


nombre:"FENIX PREMIERE HD",


comercial:{

titulo:"PROMO FENIX PREMIERE",

duracion:90,

tipo:"mp4",

url:"PROMO_FENIX"

},


programacion:[]

},




fenix_mix:{


nombre:"FENIX MIX HD",


comercial:{

titulo:"PROMO FENIX MIX",

duracion:90,

tipo:"mp4",

url:"PROMO_MIX"

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
===============================
HORA MÉXICO
===============================
*/


const mexico =
new Date(
new Date()
.toLocaleString(
"en-US",
{
timeZone:"America/Mexico_City"
}
)
);



const ahora =
Math.floor(
mexico.getTime()/1000
);





/*
===============================
CREAR CICLO LINEAL
COMERCIAL CADA 15 MINUTOS
===============================
*/


let ciclo=[];

let contador=0;



for(const contenido of CONFIG.programacion){


ciclo.push(contenido);


contador += contenido.duration;



while(contador >= 900){


ciclo.push(CONFIG.comercial);


contador -= 900;


}


}




/*
===============================
CALCULAR POSICIÓN ACTUAL
===============================
*/


const duracionTotal =
ciclo.reduce(
(total,item)=>
total + item.duration,
0
);



let posicion =
ahora % duracionTotal;



let actual=null;



for(const item of ciclo){


if(posicion < item.duration){


actual=item;

break;


}


posicion -= item.duration;


}




if(!actual){

actual=ciclo[0];

}




/*
===============================
RESPUESTA
===============================
*/


return new Response(

JSON.stringify(

{

canal:CONFIG.nombre,

titulo:actual.titulo,

duracion:actual.duration,

tipo:actual.tipo || "m3u8",

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
