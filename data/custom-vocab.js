// General vocabulary from personal readings. This file intentionally contains
// dictionary facts only; the copyrighted story text lives in encrypted storage.
export const CUSTOM_VOCAB = [
	["外星人","wài xīng rén","alien","extraterrestre"],["火星人","huǒ xīng rén","Martian","marciano"],
	["小学生","xiǎo xué shēng","primary-school student","estudiante de primaria"],["山上","shān shàng","on the mountain","en la montaña"],
	["星星","xīng xing","star","estrella"],["有时候","yǒu shíhou","sometimes","a veces"],
	["想了想","xiǎng le xiǎng","thought it over","lo pensó"],["第二天","dì-èr tiān","the next day","el día siguiente"],
	["小朋友","xiǎo péng you","child; little friend","niño; amiguito"],["有一点","yǒu yìdiǎn","a little","un poco"],
	["好笑","hǎo xiào","funny","gracioso"],["每次","měi cì","every time","cada vez"],
	["这么","zhè me","so; this much","tan; así"],["有一天","yǒu yì tiān","one day","un día"],
	["门边","mén biān","beside the door","junto a la puerta"],["一边","yì biān","while; one side","mientras; un lado"],
	["第一次","dì-yī cì","the first time","la primera vez"],["听到","tīng dào","hear","oír"],
	["一个人","yí ge rén","alone; one person","solo; una persona"],["后面","hòu mian","behind; back","detrás"],
	["回头","huí tóu","turn one's head","voltear la cabeza"],["说完","shuō wán","finish speaking","terminar de hablar"],
	["吃完","chī wán","finish eating","terminar de comer"],["这时候","zhè shíhou","at this moment","en este momento"],
	["手里","shǒu lǐ","in one's hand","en la mano"],["一下子","yí xià zi","all at once","de repente"],
	["小心","xiǎo xīn","careful","cuidado"],["不见了","bújiàn le","disappeared; missing","desapareció"],
	["听起来","tīng qilai","sound; seem by hearing","sonar"],["不可能","bù kěnéng","impossible","imposible"],
	["路上","lù shàng","on the way","en el camino"],["马上","mǎ shàng","immediately","inmediatamente"],
	["怎么会","zěnme huì","how could it be","cómo puede ser"],["听见","tīng jiàn","hear","oír"],
	["不小心","bù xiǎoxīn","accidentally","por accidente"],["本子","běn zi","notebook","cuaderno"],
	["拿到","ná dào","obtain; get","conseguir"],["点点头","diǎndian tóu","nod","asentir"],
	["一会儿","yí huìr","a little while","un rato"],["看起来","kàn qilai","look; seem","parecer"],
	["几个月","jǐ ge yuè","several months","varios meses"],["第二年","dì-èr nián","the following year","el año siguiente"],
	["下一个","xià yí ge","the next one","el siguiente"],["没想到","méi xiǎngdào","unexpectedly","sin esperarlo"]
].map(([h,p,en,es]) => ({ h,p,en,es,l:0,pos:"",custom:true,source:"My Teacher is a Martian",tags:["general","martian"] }));
