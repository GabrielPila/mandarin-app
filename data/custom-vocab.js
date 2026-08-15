// General vocabulary from personal readings. This file intentionally contains
// dictionary facts only; the copyrighted story text lives in encrypted storage.
export const CUSTOM_VOCAB = [
	["外星人","wàixīngrén","alien","extraterrestre"],["火星人","huǒxīngrén","Martian","marciano"],
	["小学生","xiǎoxuéshēng","primary-school student","estudiante de primaria"],["山上","shānshàng","on the mountain","en la montaña"],
	["星星","xīngxing","star","estrella"],["有时候","yǒu shíhou","sometimes","a veces"],
	["想了想","xiǎng le xiǎng","thought it over","lo pensó"],["第二天","dì-èr tiān","the next day","el día siguiente"],
	["小朋友","xiǎopéngyou","child; little friend","niño; amiguito"],["有一点","yǒu yìdiǎn","a little","un poco"],
	["好笑","hǎoxiào","funny","gracioso"],["每次","měi cì","every time","cada vez"],
	["这么","zhème","so; this much","tan; así"],["有一天","yǒu yì tiān","one day","un día"],
	["门边","ménbiān","beside the door","junto a la puerta"],["一边","yìbiān","while; one side","mientras; un lado"],
	["第一次","dì-yī cì","the first time","la primera vez"],["听到","tīngdào","hear","oír"],
	["一个人","yí ge rén","alone; one person","solo; una persona"],["后面","hòumian","behind; back","detrás"],
	["回头","huítóu","turn one's head","voltear la cabeza"],["说完","shuō wán","finish speaking","terminar de hablar"],
	["吃完","chī wán","finish eating","terminar de comer"],["这时候","zhè shíhou","at this moment","en este momento"],
	["手里","shǒulǐ","in one's hand","en la mano"],["一下子","yíxiàzi","all at once","de repente"],
	["小心","xiǎoxīn","careful","cuidado"],["不见了","bújiàn le","disappeared; missing","desapareció"],
	["听起来","tīng qilai","sound; seem by hearing","sonar"],["不可能","bù kěnéng","impossible","imposible"],
	["路上","lùshàng","on the way","en el camino"],["马上","mǎshàng","immediately","inmediatamente"],
	["怎么会","zěnme huì","how could it be","cómo puede ser"],["听见","tīngjiàn","hear","oír"],
	["不小心","bù xiǎoxīn","accidentally","por accidente"],["本子","běnzi","notebook","cuaderno"],
	["拿到","nádào","obtain; get","conseguir"],["点点头","diǎndian tóu","nod","asentir"],
	["一会儿","yíhuìr","a little while","un rato"],["看起来","kàn qilai","look; seem","parecer"],
	["几个月","jǐ ge yuè","several months","varios meses"],["第二年","dì-èr nián","the following year","el año siguiente"],
	["下一个","xià yí ge","the next one","el siguiente"],["没想到","méi xiǎngdào","unexpectedly","sin esperarlo"]
].map(([h,p,en,es]) => ({ h,p,en,es,l:0,pos:"",custom:true,source:"My Teacher is a Martian",tags:["general","martian"] }));
