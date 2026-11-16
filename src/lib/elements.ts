const rawElements = `H Hydrogen|He Helium|Li Lithium|Be Beryllium|B Boron|C Carbon|N Nitrogen|O Oxygen|F Fluorine|Ne Neon|Na Sodium|Mg Magnesium|Al Aluminum|Si Silicon|P Phosphorus|S Sulfur|Cl Chlorine|Ar Argon|K Potassium|Ca Calcium|Sc Scandium|Ti Titanium|V Vanadium|Cr Chromium|Mn Manganese|Fe Iron|Co Cobalt|Ni Nickel|Cu Copper|Zn Zinc|Ga Gallium|Ge Germanium|As Arsenic|Se Selenium|Br Bromine|Kr Krypton|Rb Rubidium|Sr Strontium|Y Yttrium|Zr Zirconium|Nb Niobium|Mo Molybdenum|Tc Technetium|Ru Ruthenium|Rh Rhodium|Pd Palladium|Ag Silver|Cd Cadmium|In Indium|Sn Tin|Sb Antimony|Te Tellurium|I Iodine|Xe Xenon|Cs Cesium|Ba Barium|La Lanthanum|Ce Cerium|Pr Praseodymium|Nd Neodymium|Pm Promethium|Sm Samarium|Eu Europium|Gd Gadolinium|Tb Terbium|Dy Dysprosium|Ho Holmium|Er Erbium|Tm Thulium|Yb Ytterbium|Lu Lutetium|Hf Hafnium|Ta Tantalum|W Tungsten|Re Rhenium|Os Osmium|Ir Iridium|Pt Platinum|Au Gold|Hg Mercury|Tl Thallium|Pb Lead|Bi Bismuth|Po Polonium|At Astatine|Rn Radon|Fr Francium|Ra Radium|Ac Actinium|Th Thorium|Pa Protactinium|U Uranium|Np Neptunium|Pu Plutonium|Am Americium|Cm Curium|Bk Berkelium|Cf Californium|Es Einsteinium|Fm Fermium|Md Mendelevium|No Nobelium|Lr Lawrencium|Rf Rutherfordium|Db Dubnium|Sg Seaborgium|Bh Bohrium|Hs Hassium|Mt Meitnerium|Ds Darmstadtium|Rg Roentgenium|Cn Copernicium|Nh Nihonium|Fl Flerovium|Mc Moscovium|Lv Livermorium|Ts Tennessine|Og Oganesson`;
const elements = rawElements.split('|').map((entry, index) => {
  const [symbol, ...parts] = entry.split(' ');
  return { atomicNumber: index + 1, symbol, name: parts.join(' ') };
});
const groupByAtomicNumber = (z:number):number => {
  if (z===1||z===3||z===11||z===19||z===37||z===55||z===87) return 1;
  if (z===4||z===12||z===20||z===38||z===56||z===88) return 2;
  if (z===2||z===10||z===18||z===36||z===54||z===86||z===118) return 18;
  if (z>=5&&z<=10) return z+8;
  if (z>=13&&z<=18) return z;
  if (z>=21&&z<=30) return z-18;
  if (z>=31&&z<=36) return z-18;
  if (z>=39&&z<=48) return z-36;
  if (z>=49&&z<=54) return z-36;
  if (z>=57&&z<=71) return 3+(z-57);
  if (z>=72&&z<=80) return z-68;
  if (z>=81&&z<=86) return z-68;
  if (z>=89&&z<=103) return 3+(z-89);
  if (z>=104&&z<=112) return z-100;
  if (z>=113&&z<=118) return z-100;
  return 0;
};
const periodByAtomicNumber = (z:number):number => z<=2?1:z<=10?2:z<=18?3:z<=36?4:z<=54?5:z<=86?6:7;
export const ELEMENTS = elements.map(e => {
  const z=e.atomicNumber, period=periodByAtomicNumber(z), group=groupByAtomicNumber(z);
  const lanth=z>=57&&z<=71, act=z>=89&&z<=103;
  const displayPeriod=lanth?8:act?9:period;
  const family=lanth?'Lanthanide':act?'Actinide':group===1?'Alkali metal':group===2?'Alkaline earth metal':group===17?'Halogen':group===18?'Noble gas':group>=3&&group<=12?'Transition metal':group===16?'Chalcogen':group===15?'Pnictogen':'Other element';
  return {...e,period:displayPeriod,group,family};
});