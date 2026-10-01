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
"https://servidor.com/promos/bumper_hbo_family.ts"
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


nombre:"FENIX PREMIERE",


comercial:{
titulo:"PROMO FENIX",
duracion:90,
url:"PROMO_FENIX"
},


programacion:[]


},



fenix_mix:{


nombre:"FENIX MIX",


comercial:{
titulo:"PROMO FENIX MIX",
duracion:90,
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
{status:404}
);

}





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



const segundos =
Math.floor(
mexico.getTime()/1000
);





/*
=================================
RELOJ LINEAL
=================================
*/


let contenido=[];


let acumulado=0;



let ciclo=[];


/*
Insertamos comercial cada 15 minutos
*/


let contador=0;


for(const item of CONFIG.programacion){


ciclo.push(item);


contador += item.duration;



if(contador>=900){


ciclo.push(CONFIG.comercial);


contador=0;


}


}




const duracionTotal =
ciclo.reduce(
(a,b)=>a+b.duration,
0
);




let posicion =
segundos % duracionTotal;



let actual=null;



for(const item of ciclo){


if(posicion < item.duration){


actual=item;

break;


}


posicion-=item.duration;


}




return new Response(
JSON.stringify({

canal:CONFIG.nombre,

titulo:actual.titulo,

duracion:actual.duration,

url:actual.url,

offset:posicion


},null,2),
{

headers:{
"Content-Type":"application/json"
}

}
);



}


};
