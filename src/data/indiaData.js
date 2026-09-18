// Helper function to generate pincode ranges
const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());

export const indiaData = {
  'Andhra Pradesh': {
    'Visakhapatnam': range(530001, 530048),
    'Vijayawada': range(520001, 520015),
    'Guntur': range(522001, 522007),
    'Nellore': range(524001, 524004),
    'Kurnool': range(518001, 518004),
    'Kakinada': range(533001, 533005),
    'Rajahmundry': range(533101, 533107),
    'Tirupati': range(517501, 517507),
    'Anantapur': ['515001', '515002'],
    'Kadapa': ['516001', '516002']
  },
  'Arunachal Pradesh': {
    'Itanagar': ['791111', '791113'],
    'Naharlagun': ['791110'],
    'Pasighat': ['791102'],
    'Tawang': ['790104'],
    'Ziro': ['791120']
  },
  'Assam': {
    'Guwahati': range(781001, 781040),
    'Silchar': ['788001', '788002'],
    'Dibrugarh': ['786001', '786002'],
    'Jorhat': ['785001', '785002'],
    'Nagaon': ['782001', '782002'],
    'Tinsukia': ['786125'],
    'Tezpur': ['784001']
  },
  'Bihar': {
    'Patna': range(800001, 800028),
    'Gaya': ['823001', '823002'],
    'Bhagalpur': ['812001', '812002'],
    'Muzaffarpur': ['842001', '842002'],
    'Purnia': ['854301'],
    'Darbhanga': ['846001'],
    'Arrah': ['802301'],
    'Begusarai': ['851101'],
    'Katihar': ['854105'],
    'Munger': ['811201']
  },
  'Chhattisgarh': {
    'Raipur': range(492001, 492015),
    'Bhilai': ['490001', '490002'],
    'Bilaspur': ['495001', '495002'],
    'Korba': ['495677'],
    'Rajnandgaon': ['491441'],
    'Jagdalpur': ['494001'],
    'Ambikapur': ['497001']
  },
  'Goa': {
    'Panaji': ['403001'],
    'Margao': ['403601'],
    'Vasco da Gama': ['403802'],
    'Mapusa': ['403507'],
    'Ponda': ['403401']
  },
  'Gujarat': {
    'Ahmedabad': range(380001, 380063),
    'Surat': range(395001, 395012),
    'Vadodara': range(390001, 390025),
    'Rajkot': range(360001, 360007),
    'Bhavnagar': ['364001', '364002'],
    'Jamnagar': ['361001', '361002'],
    'Junagadh': ['362001'],
    'Gandhinagar': range(382010, 382025),
    'Anand': ['388001'],
    'Navsari': ['396445'],
    'Morbi': ['363641'],
    'Bharuch': ['392001']
  },
  'Haryana': {
    'Faridabad': range(121001, 121009),
    'Gurgaon': range(122001, 122022),
    'Panipat': ['132103'],
    'Ambala': ['133001', '134003'],
    'Yamunanagar': ['135001'],
    'Rohtak': ['124001'],
    'Hisar': ['125001'],
    'Karnal': ['132001'],
    'Sonipat': ['131001'],
    'Panchkula': ['134109']
  },
  'Himachal Pradesh': {
    'Shimla': ['171001', '171002'],
    'Dharamshala': ['176215'],
    'Solan': ['173212'],
    'Mandi': ['175001'],
    'Kullu': ['175101'],
    'Hamirpur': ['177001']
  },
  'Jharkhand': {
    'Jamshedpur': range(831001, 831018),
    'Dhanbad': range(826001, 826008),
    'Ranchi': range(834001, 834010),
    'Bokaro Steel City': ['827001'],
    'Deoghar': ['814112'],
    'Phusro': ['829144'],
    'Hazaribagh': ['825301']
  },
  'Karnataka': {
    'Bangalore': range(560001, 560110),
    'Mysore': range(570001, 570030),
    'Hubli-Dharwad': range(580001, 580030),
    'Mangalore': range(575001, 575030),
    'Belgaum': range(590001, 590020),
    'Gulbarga': range(585101, 585106),
    'Davanagere': range(577001, 577006),
    'Bellary': range(583101, 583106),
    'Shimoga': range(577201, 577205),
    'Tumkur': range(572101, 572107),
    'Raichur': ['584101'],
    'Bidar': ['585401'],
    'Hospet': ['583201'],
    'Hassan': ['573201'],
    'Gadag-Betageri': ['582101'],
    'Udupi': ['576101'],
    'Robertsonpet': ['563122'],
    'Bhadravati': ['577301'],
    'Chitradurga': ['577501'],
    'Kolar': ['563101']
  },
  'Kerala': {
    'Trivandrum': range(695001, 695043),
    'Kochi': range(682001, 682042),
    'Kozhikode': range(673001, 673032),
    'Kollam': ['691001'],
    'Thrissur': ['680001'],
    'Alappuzha': ['688001'],
    'Palakkad': ['678001'],
    'Malappuram': ['676505']
  },
  'Madhya Pradesh': {
    'Indore': range(452001, 452020),
    'Bhopal': range(462001, 462047),
    'Jabalpur': range(482001, 482011),
    'Gwalior': range(474001, 474012),
    'Ujjain': ['456001'],
    'Sagar': ['470001'],
    'Dewas': ['455001'],
    'Satna': ['485001'],
    'Ratlam': ['457001'],
    'Rewa': ['486001']
  },
  'Maharashtra': {
    'Mumbai': range(400001, 400104),
    'Pune': range(411001, 411062),
    'Nagpur': range(440001, 440037),
    'Nashik': range(422001, 422013),
    'Aurangabad': range(431001, 431010),
    'Solapur': range(413001, 413008),
    'Amravati': range(444601, 444609),
    'Kolhapur': range(416001, 416013),
    'Navi Mumbai': range(400701, 400710),
    'Akola': ['444001', '444002'],
    'Jalgaon': ['425001'],
    'Latur': ['413512'],
    'Dhule': ['424001'],
    'Ahmednagar': ['414001'],
    'Chandrapur': ['442401'],
    'Parbhani': ['431401'],
    'Ichalkaranji': ['416115'],
    'Jalna': ['431203'],
    'Ambarnath': ['421501'],
    'Bhusawal': ['425201']
  },
  'Manipur': {
    'Imphal': ['795001'],
    'Thoubal': ['795138'],
    'Bishnupur': ['795126']
  },
  'Meghalaya': {
    'Shillong': ['793001'],
    'Tura': ['794001'],
    'Jowai': ['793150']
  },
  'Mizoram': {
    'Aizawl': ['796001'],
    'Lunglei': ['796701']
  },
  'Nagaland': {
    'Kohima': ['797001'],
    'Dimapur': ['797112'],
    'Mokokchung': ['798601']
  },
  'Odisha': {
    'Bhubaneswar': range(751001, 751030),
    'Cuttack': range(753001, 753015),
    'Rourkela': range(769001, 769016),
    'Berhampur': ['760001'],
    'Sambalpur': ['768001'],
    'Puri': ['752001'],
    'Balasore': ['756001']
  },
  'Punjab': {
    'Ludhiana': range(141001, 141015),
    'Amritsar': range(143001, 143008),
    'Jalandhar': range(144001, 144014),
    'Patiala': ['147001'],
    'Bathinda': ['151001'],
    'Hoshiarpur': ['146001'],
    'Mohali': ['160055', '160062'],
    'Pathankot': ['145001']
  },
  'Rajasthan': {
    'Jaipur': range(302001, 302039),
    'Jodhpur': range(342001, 342015),
    'Udaipur': range(313001, 313004),
    'Kota': range(324001, 324010),
    'Ajmer': range(305001, 305008),
    'Bikaner': ['334001', '334002'],
    'Bhilwara': ['311001', '311002'],
    'Alwar': ['301001'],
    'Bharatpur': ['321001'],
    'Sikar': ['332001'],
    'Pali': ['306401'],
    'Sri Ganganagar': ['335001']
  },
  'Sikkim': {
    'Gangtok': ['737101'],
    'Namchi': ['737126']
  },
  'Tamil Nadu': {
    'Chennai': range(600001, 600132),
    'Coimbatore': range(641001, 641062),
    'Madurai': range(625001, 625020),
    'Tiruchirappalli': range(620001, 620026),
    'Salem': range(636001, 636016),
    'Tirunelveli': range(627001, 627012),
    'Ambattur': ['600053'],
    'Tiruppur': ['641601'],
    'Erode': ['638001', '638002'],
    'Avadi': ['600054'],
    'Vellore': ['632001'],
    'Thoothukudi': ['628001'],
    'Nagercoil': ['629001'],
    'Thanjavur': ['613001'],
    'Dindigul': ['624001']
  },
  'Telangana': {
    'Hyderabad': range(500001, 500098),
    'Warangal': range(506001, 506015),
    'Nizamabad': ['503001', '503002'],
    'Karimnagar': ['505001', '505002'],
    'Ramagundam': ['505208', '505209'],
    'Khammam': ['507001', '507002'],
    'Mahbubnagar': ['509001'],
    'Nalgonda': ['508001']
  },
  'Tripura': {
    'Agartala': ['799001'],
    'Udaipur': ['799105'],
    'Dharmanagar': ['799250']
  },
  'Uttar Pradesh': {
    'Lucknow': range(226001, 226028),
    'Kanpur': range(208001, 208027),
    'Agra': range(282001, 282010),
    'Varanasi': range(221001, 221011),
    'Meerut': range(250001, 250005),
    'Prayagraj': range(211001, 211019),
    'Ghaziabad': range(201001, 201019),
    'Bareilly': range(243001, 243006),
    'Aligarh': range(202001, 202002),
    'Moradabad': ['244001'],
    'Saharanpur': ['247001'],
    'Gorakhpur': ['273001'],
    'Noida': range(201301, 201318),
    'Firozabad': ['283203'],
    'Loni': ['201102'],
    'Jhansi': ['284001'],
    'Muzaffarnagar': ['251001'],
    'Mathura': ['281001'],
    'Shahjahanpur': ['242001']
  },
  'Uttarakhand': {
    'Dehradun': range(248001, 248012),
    'Haridwar': ['249401'],
    'Roorkee': ['247667'],
    'Haldwani': ['263139'],
    'Rudrapur': ['263153'],
    'Kashipur': ['244713']
  },
  'West Bengal': {
    'Kolkata': range(700001, 700158),
    'Howrah': range(711101, 711114),
    'Durgapur': range(713201, 713218),
    'Asansol': range(713301, 713306),
    'Siliguri': range(734001, 734014),
    'Maheshtala': ['700141'],
    'Rajpur Sonarpur': ['700150'],
    'Gopalpur': ['700136'],
    'Bhatpara': ['743123'],
    'Panihati': ['700114']
  },
  'Delhi': {
    'New Delhi': range(110001, 110068),
    'South Delhi': range(110011, 110080),
    'North Delhi': range(110031, 110094),
    'West Delhi': range(110015, 110064),
    'East Delhi': range(110091, 110096)
  },
  'Chandigarh': {
    'Chandigarh': range(160001, 160062)
  },
  'Jammu and Kashmir': {
    'Srinagar': range(190001, 190024),
    'Jammu': range(180001, 180020),
    'Anantnag': ['192101'],
    'Baramulla': ['193101']
  },
  'Puducherry': {
    'Puducherry': range(605001, 605014),
    'Karaikal': ['609602'],
    'Mahe': ['673310'],
    'Yanam': ['533464']
  },
  'Ladakh': {
    'Leh': ['194101'],
    'Kargil': ['194103']
  },
  'Andaman and Nicobar Islands': {
    'Port Blair': ['744101'],
    'Bamboo Flat': ['744107']
  },
  'Dadra and Nagar Haveli and Daman and Diu': {
    'Daman': ['396210'],
    'Diu': ['362520'],
    'Silvassa': ['396230']
  },
  'Lakshadweep': {
    'Kavaratti': ['682555'],
    'Agatti': ['682553']
  }
};
