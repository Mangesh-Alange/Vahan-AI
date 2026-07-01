export interface KnowledgeBaseEntry {
  id: string;
  symptom_hindi: string;
  symptom_english: string;
  likely_causes: string[];
  severity: "drive" | "caution" | "stop_immediately";
  typical_cost_range: string;
  vehicle_types: string[];
  recommended_action: string;
  acoustic_signal_class?: string;
}

export const faultKnowledgeBase: KnowledgeBaseEntry[] = [
  {
    id: "kb_01",
    symptom_hindi: "Gaadi ka engine band ho raha hai baar baar, thoda kaala dhua bhi aa raha hai",
    symptom_english: "The engine stalls repeatedly, and some black smoke is coming out",
    likely_causes: ["Fuel Injector clogging", "Fuel pump calibration issue", "EGR valve stuck open", "Clogged Air Filter"],
    severity: "stop_immediately",
    typical_cost_range: "₹8,000 - ₹22,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Immediately park the vehicle safely. Do not restart the engine. Check the fuel lines, injector nozzles, and air intake. A technician needs to inspect the common rail injection pressure.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_02",
    symptom_hindi: "Break dabaane par cheekhney ki tez aawaz aa rahi hai aur pedal kaanp raha hai",
    symptom_english: "High-pitched squealing noise when applying brakes, and the brake pedal vibrates",
    likely_causes: ["Worn brake pads (metal-on-metal)", "Warped brake rotors", "Caliper pin seizure"],
    severity: "stop_immediately",
    typical_cost_range: "₹3,500 - ₹9,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Brake system integrity compromised. Replace brake pads and inspect/resurface brake discs immediately. Driving with worn pads can lead to complete braking failure.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_03",
    symptom_hindi: "Engine se lagatar khat-khat ki aawaz aa rahi hai, speed badhne par aawaz tez hoti hai",
    symptom_english: "Continuous metallic knocking noise from engine, getting louder as speed increases",
    likely_causes: ["Connecting rod bearing wear", "Piston slap", "Low oil pressure causing valve tapping"],
    severity: "stop_immediately",
    typical_cost_range: "₹25,000 - ₹65,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Turn off engine immediately. Internal mechanical damage in progress. Inspect oil level; if oil is low, fill and check if noise persists. Do not tow or drive; call a recovery crane.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_04",
    symptom_hindi: "Silencer se neela dhua nikal raha hai aur engine thoda thoda jhatka le raha hai",
    symptom_english: "Blue smoke coming from exhaust, and the engine is misfiring or sputtering",
    likely_causes: ["Piston ring wear leading to oil burning", "Valve stem seal failure", "Turbocharger seal leak"],
    severity: "caution",
    typical_cost_range: "₹15,000 - ₹40,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Engine is burning engine oil. Monitor the oil level closely. Avoid high speeds and heavy payloads. Schedule an engine head compression test and turbo charger inspection.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_05",
    symptom_hindi: "Engine temperature gauge poora laal pe chala gaya hai, bonnet se bhaap nikal rahi hai",
    symptom_english: "Engine temperature gauge has reached the red line, steam is coming from the hood",
    likely_causes: ["Coolant leak / radiator puncture", "Thermostat valve failure", "Radiator fan belt broken", "Water pump failure"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,500 - ₹12,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Pull over immediately. Do not open the radiator cap while hot (risk of severe burns). Wait for engine to cool (30 mins), check coolant reservoir, refill with clean water/coolant, check for visible hose leaks.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_06",
    symptom_hindi: "Gear badalne me bohot dikkat ho rahi hai, clutch dabaane par bhi gear fas raha hai",
    symptom_english: "Difficult to shift gears, gear gets stuck even when clutch pedal is fully pressed",
    likely_causes: ["Clutch master or slave cylinder leak", "Worn clutch pressure plate", "Gearbox synchronizer ring wear"],
    severity: "caution",
    typical_cost_range: "₹6,000 - ₹18,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Check clutch fluid level in the reservoir. If empty, refill and pump clutch. Drive cautiously in a single gear to the nearest service center. Gearbox internal wear may occur if gears are forced.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_07",
    symptom_hindi: "Steering wheel bohot bhari ho gaya hai, dhumane par cheen-cheen ki aawaz aati hai",
    symptom_english: "Steering wheel feels extremely heavy, squeals when turning fully",
    likely_causes: ["Power steering fluid leak", "Power steering pump failure", "Serpentine belt loose or broken"],
    severity: "caution",
    typical_cost_range: "₹1,800 - ₹7,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Inspect power steering oil reservoir. Top up immediately. Inspect the auxiliary drive belt for cracks or tension. Drive slowly as steering effort is high, especially at slow turns.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_08",
    symptom_hindi: "Acceleration dabaane par gurgur ki aawaz aati hai aur power nahi mil rahi hai",
    symptom_english: "Sputtering/gurgling noise on acceleration, accompanied by severe loss of power",
    likely_causes: ["Turbocharger hose pipe loose/cracked", "Intercooler leak", "Mass Air Flow (MAF) sensor fault"],
    severity: "caution",
    typical_cost_range: "₹3,000 - ₹15,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Check the large black rubber hoses connected to the turbocharger and intercooler. Secure any loose clamps. Avoid hard acceleration to prevent further turbo damage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_09",
    symptom_hindi: "Subah ke time gaadi start nahi ho rahi, self lene par thik-thik-thik aawaz aati hai",
    symptom_english: "Vehicle won't start in the morning, makes rapid clicking sound when turning key",
    likely_causes: ["Discharged or dead battery", "Corroded battery terminals", "Alternator failing to charge battery"],
    severity: "drive",
    typical_cost_range: "₹1,000 - ₹8,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Battery charge is too low to crank. Check terminal connections for white powder/rust, clean with warm water. Try jump-starting from another vehicle or recharge battery. Check alternator voltage when started.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_10",
    symptom_hindi: "Cabin me bohot tez vibration ho raha hai jab gaadi idle khadi hoti hai",
    symptom_english: "Severe cabin vibration when the vehicle is idling at a standstill",
    likely_causes: ["Worn or broken engine mounting rubber", "Engine misfiring at low RPM", "Damaged balancer shaft"],
    severity: "caution",
    typical_cost_range: "₹4,000 - ₹12,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Drive to the nearest depot. Avoid idling for long periods. Inspect the main engine mounting bolts and rubber pads. Replace worn mountings to prevent exhaust and drive-shaft misalignment.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_11",
    symptom_hindi: "Daudne me piche se dhum-dhum ki tez aawaz aa rahi hai aur piche ka axle garam ho raha hai",
    symptom_english: "Loud humming noise from rear axle while driving, and differential housing is hot",
    likely_causes: ["Lack of differential gear oil", "Worn crown wheel or pinion bearing", "Differential gear damage"],
    severity: "stop_immediately",
    typical_cost_range: "₹8,000 - ₹28,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Stop and inspect rear differential housing for active oil leaks. Running dry will seize the rear axle, locking the wheels at high speed. Add differential oil (EP-90) immediately or call a mobile mechanic.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_12",
    symptom_hindi: "Engine se seeti jaisi tez aawaz aa rahi hai jab turbo badhta hai",
    symptom_english: "Loud high-pitched whistling/screeching noise from engine when turbo boosts",
    likely_causes: ["Turbocharger rotor bearing failure", "Manifold gasket leak", "Cracked exhaust pipe before turbo"],
    severity: "caution",
    typical_cost_range: "₹12,000 - ₹35,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Mahindra Blazo"],
    recommended_action: "Inspect the turbocharger inlet compressor wheel for play or damage. Avoid high engine RPM. Do not let debris enter the air intake. Plan a turbocharger replacement/repair soon.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_13",
    symptom_hindi: "Gaadi ek taraf khinch rahi hai aur front tyre ek side se jaldi ghis raha hai",
    symptom_english: "Vehicle pulls strongly to one side, and front tyre is wearing unevenly on one edge",
    likely_causes: ["Incorrect wheel alignment (Toe-in/Toe-out)", "Worn tie rod ends or ball joints", "Unequal tyre pressure"],
    severity: "drive",
    typical_cost_range: "₹1,500 - ₹5,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Correct tyre inflation pressures. Check for play in steering linkages. Take the vehicle for dynamic wheel alignment and balance at the next terminal stop. Replacing steering linkages may be required.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_14",
    symptom_hindi: "Dashboard par Air Pressure low alarm baj raha hai aur brake lagane me zyada time lag raha hai",
    symptom_english: "Low Air Pressure alarm buzzing on dashboard, brakes responding slowly",
    likely_causes: ["Air compressor line leak", "Punctured air reservoir or dual brake valve leak", "Unloader valve stuck open"],
    severity: "stop_immediately",
    typical_cost_range: "₹4,500 - ₹16,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "CRITICAL SAFETY RISK. Air brake pressure must be above 6 bar for brakes to function safely. Stop vehicle immediately. Listen for active air leaks (hissing sound) near the chassis and pneumatic tanks. Call emergency service.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_15",
    symptom_hindi: "Engine ka oil check karne par oil safed chipchipa dahi jaisa dikh raha hai",
    symptom_english: "Engine oil looks milky white, thick, like curd when checked on the dipstick",
    likely_causes: ["Blown head gasket", "Cracked engine block or cylinder head", "Oil cooler core leakage"],
    severity: "stop_immediately",
    typical_cost_range: "₹18,000 - ₹45,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Do not start or run the engine. Coolant is mixing with engine oil, which destroys the lubrication properties and will ruin bearings instantly. Tow the vehicle to a major repair shop immediately.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_16",
    symptom_hindi: "Fuel tank ke paas se diesel tapak raha hai aur cabin me smell aa rahi hai",
    symptom_english: "Diesel is dripping from near the fuel tank, strong diesel smell inside the cabin",
    likely_causes: ["Fuel tank puncture/rust", "Cracked fuel return line", "Loose fuel filter casing"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,000 - ₹12,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Extremely high fire hazard. Stop the engine. Clean spilled fuel. Trace leakage near the primary fuel filter or return hose. Tighten filter cap or temporarily patch tank puncture with soap/chemical sealant before repair.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_17",
    symptom_hindi: "Clutch dabaane par lagatar ghargharat ki tez aawaz aa rahi hai",
    symptom_english: "Grinding/squealing noise when pressing the clutch pedal, goes away when released",
    likely_causes: ["Worn clutch release bearing (throw-out bearing)", "Pilot bearing failure", "Bent clutch release fork"],
    severity: "caution",
    typical_cost_range: "₹4,500 - ₹11,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "The clutch release bearing is failing. Avoid holding the clutch pedal pressed at traffic lights or during stops (shift to neutral). Plan to replace the clutch kit (bearing, pressure plate, and friction disc) soon.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_18",
    symptom_hindi: "Engine start hone par alternator warning light jal rahi hai aur headlight bohot dheemi hai",
    symptom_english: "Alternator warning light stays on when engine runs, headlights are dim",
    likely_causes: ["Alternator drive belt slipped/broken", "Worn alternator carbon brushes or internal regulator fault", "Loose wiring harness connector"],
    severity: "caution",
    typical_cost_range: "₹3,000 - ₹10,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "The battery is not charging. Minimize electrical load (turn off cabin fans, extra lights). Drive straight to an auto electrician. If the alternator belt is broken, it might also run the water pump - check temperature gauge!",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_19",
    symptom_hindi: "Gaadi dhumane par tyre ke side se khat-khat ki aawaz aati hai",
    symptom_english: "Knocking/clicking sound from wheels when making sharp turns",
    likely_causes: ["Worn CV joint (for front wheel drives)", "Damaged kingpin / steering knuckle bearing", "Loose wheel nuts"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,500 - ₹8,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost"],
    recommended_action: "Check wheel nuts immediately to ensure the wheel is secure. If wheel nuts are tight, inspect steering knuckle and joint boots. Worn joints can break and cause wheel detachment.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_20",
    symptom_hindi: "Exhaust se bohot tez safed dhua nikal raha hai jisme mithi sweet smell hai",
    symptom_english: "Thick white smoke with a sweet smell coming from the exhaust pipe",
    likely_causes: ["Coolant entering combustion chamber", "Head gasket failure", "EGR cooler internal leak"],
    severity: "stop_immediately",
    typical_cost_range: "₹12,000 - ₹35,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Coolant is leaking into cylinders. Do not drive as it can cause hydrostatic lock (hydrolock), which completely destroys the engine block. Check coolant levels and tow the truck to a service center.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_21",
    symptom_hindi: "Gear lever bohot dheela hai aur gear engage karne par bhi neutral ho jata hai",
    symptom_english: "Gear lever feels extremely loose, jumps back into neutral on its own",
    likely_causes: ["Broken gear shifting cable or linkage bushing", "Synchro mesh teeth worn out", "Weak detent spring in gearbox"],
    severity: "caution",
    typical_cost_range: "₹2,500 - ₹12,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Inspect gear shifter linkages under the cabin. bushings can easily be replaced. Avoid holding the gear lever in place forcibly while driving as it wears out shift forks rapidly.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_22",
    symptom_hindi: "Suspension se dhum-dhum aawaz aati hai jab gaadi gaddho me jati hai",
    symptom_english: "Thudding noise from suspension when going over potholes/bumps",
    likely_causes: ["Leaf spring bush wear", "Damaged shock absorbers", "Broken center bolt of leaf spring pack"],
    severity: "caution",
    typical_cost_range: "₹3,500 - ₹14,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Inspect the leaf spring assemblies on both axles for broken plates or dislodged center bolts. Do not overload the vehicle. Drive slowly over bumps to prevent structural frame damage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_23",
    symptom_hindi: "Engine start hone me bohot lamba self le raha hai aur acceleration dheemi hai",
    symptom_english: "Engine takes a very long time to start (long crank), sluggish acceleration",
    likely_causes: ["Low rail pressure in CRDI system", "Clogged fuel filter", "Glow plug failure (cold start only)", "Weak starter motor"],
    severity: "caution",
    typical_cost_range: "₹4,000 - ₹18,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Replace fuel filters (both primary sedimenter and secondary paper filter). Bleed the fuel system to remove any trapped air. Check starting battery cranking voltage.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_24",
    symptom_hindi: "Exhaust pipe se teekhi aawaz aa rahi hai jaise hawa leak ho rahi ho",
    symptom_english: "Hissing or leaking air sound from the exhaust manifold area",
    likely_causes: ["Exhaust manifold gasket leak", "Cracked exhaust manifold", "Loose turbo outlet pipe flange"],
    severity: "drive",
    typical_cost_range: "₹1,500 - ₹6,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Exhaust gases are escaping before the muffler. Can cause high cabin soot/CO levels. Drive with windows cracked open. Schedule manifold bolt tightening and gasket replacement.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_25",
    symptom_hindi: "Tyre ke paas se grease tapak raha hai aur drum bohot garam ho gaya hai",
    symptom_english: "Grease leaking from wheel hub, and brake drum is extremely hot to touch",
    likely_causes: ["Wheel bearing grease seal failure", "Worn wheel bearings", "Brake shoe lining binding (stuck brake)"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,500 - ₹8,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Stop immediately. The wheel bearing is dry and running hot, or the brakes are jammed. Continuing to drive will lead to weld-seizure of the hub, which can shear the wheel spindle off the axle. Call recovery.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_26",
    symptom_hindi: "DPF/AdBlue filter dashboard light blink kar rahi hai aur speed limit lag gayi hai",
    symptom_english: "DPF warning light is blinking, and engine is in limp/de-rated mode with speed limit",
    likely_causes: ["DPF soot accumulation", "AdBlue (DEF) injector failure", "Quality of diesel exhaust fluid is poor"],
    severity: "caution",
    typical_cost_range: "₹5,000 - ₹25,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Exhaust system needs soot regeneration. If possible, run the vehicle at a high speed (above 50 km/h) for 30 minutes to trigger passive regeneration, or perform parked DPF manual regeneration via diagnostic tool.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_27",
    symptom_hindi: "Engine start karte hi kharkharahat ki aawaz aati hai aur key chhodne par bhi aawaz rehti hai",
    symptom_english: "Loud rattling/grinding noise immediately upon starter crank, persists after key release",
    likely_causes: ["Starter motor starter gear pinion sticking", "Damaged flywheel ring gear teeth", "Starter solenoid failure"],
    severity: "stop_immediately",
    typical_cost_range: "₹3,500 - ₹11,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Turn off battery isolator key immediately. The starter pinion is staying engaged with the rotating flywheel, which will spin the starter to destruction and can cause starter motor wiring fire. Tap starter or call auto electrician.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_28",
    symptom_hindi: "Cabin me thanda hawa nahi aa rahi, AC compressor se lagatar cheekhney ki aawaz hai",
    symptom_english: "AC cabin vents blowing warm air, screeching sound from AC compressor area",
    likely_causes: ["AC compressor clutch bearing failure", "Low refrigerant charge causing compressor drag", "Drive belt slipping"],
    severity: "drive",
    typical_cost_range: "₹2,000 - ₹15,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Mahindra Blazo"],
    recommended_action: "Turn off the AC switch in the cabin. The compressor bearing or belt is seizing. Turning the AC off disengages the pulley, allowing you to drive safely without snapping the main auxiliary belt.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_29",
    symptom_hindi: "Gaadi upar chadhte samay dhum-dhum karke dhas rahi hai aur cluth slip ho raha hai",
    symptom_english: "Truck struggles to climb inclines, engine revs up but speed doesn't increase (clutch slip)",
    likely_causes: ["Worn out clutch plate friction material", "Oil on clutch lining from rear main seal leak", "Weak pressure plate springs"],
    severity: "caution",
    typical_cost_range: "₹8,500 - ₹24,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa", "Tata Prima"],
    recommended_action: "Avoid loading additional weight. Shifting to lower gears earlier on climbs to minimize slip. Avoid half-clutch operations. Plan clutch kit replacement at the nearest transit hub.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_30",
    symptom_hindi: "Air brake pipe se lagatar phis-phis ki aawaz aa rahi hai piche ke tyre ke pass",
    symptom_english: "Continuous air leakage sound (hissing) near rear wheels",
    likely_causes: ["Damaged air brake chamber diaphragm", "Loose hose connection to spring brake valve", "Failed brake chamber seal"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,800 - ₹7,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Rear spring brakes might lock up unexpectedly while driving. Stop the vehicle safely. Inspect the rubber air hose feeding the rear cylinders. Do not attempt to bypass air brake safety lines.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_31",
    symptom_hindi: "Accelerator chhodne par gaadi me bohot tez jhatka lag raha hai",
    symptom_english: "Severe jerking of vehicle immediately when releasing accelerator pedal",
    likely_causes: ["Worn universal joints (U-joints) in propeller shaft", "Loose engine mountings", "Backlash in differential gears"],
    severity: "caution",
    typical_cost_range: "₹3,000 - ₹9,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Crawl under vehicle (with wheels chocked) and shake propeller shaft to feel for play in U-joints. If loose, replace cross pins immediately. Pin failure at high speeds will drop propeller shaft, causing catastrophic rollover.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_32",
    symptom_hindi: "Headlight blink kar rahi hai aur dashboard par sari lights up-down ho rahi hai",
    symptom_english: "Headlights flickering and dashboard instrument cluster dials fluctuating",
    likely_causes: ["Loose or corroded primary chassis ground cable", "Failed voltage regulator on alternator", "Ignition switch wear"],
    severity: "caution",
    typical_cost_range: "₹1,200 - ₹4,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Locate main battery ground strap connected to frame/gearbox. Clean and tighten battery terminals. Check alternator charging output - if voltage spikes above 15V, it can fry electronic control modules (ECUs).",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_33",
    symptom_hindi: "Radiator reserve bottle se coolant ubal kar bahar aa raha hai aur temperature normal hai",
    symptom_english: "Coolant boiling out of reservoir tank but temperature gauge reads normal",
    likely_causes: ["Failed radiator pressure cap", "Blockage in radiator bypass core", "Combustion gases leaking into coolant (head gasket)"],
    severity: "caution",
    typical_cost_range: "₹800 - ₹14,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Allow engine to cool. Replace radiator cap with correct rating. Check reservoir overflow lines. If coolant bubbles aggressively even when engine is warm but not hot, check for head gasket seal leaks.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_34",
    symptom_hindi: "Front wheels se cheekhney ki lagatar aawaz aa rahi hai jo speed ke sath badhti hai",
    symptom_english: "Continuous squealing/howling noise from front wheels, pitch rises with speed",
    likely_causes: ["Worn wheel hubs / dry bearings", "Brake pad indicator touching rotor", "Warped splash guard scratching rotor"],
    severity: "caution",
    typical_cost_range: "₹2,500 - ₹8,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Drive to nearest station. Jack up axle and rotate wheel by hand, feeling for roughness or grinding. Dismantle hub, pack with fresh high-temperature grease or replace damaged bearings.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_35",
    symptom_hindi: "Clutch dabaane par pedal floor se chipak gaya hai aur upar nahi aa raha",
    symptom_english: "Clutch pedal feels completely spongy and sticks to the floor, won't return",
    likely_causes: ["Friction seal blow-by in master cylinder", "Clutch fluid lines burst", "Helper spring broken"],
    severity: "stop_immediately",
    typical_cost_range: "₹2,000 - ₹6,500",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Do not attempt to shift gears forcibly. Turn off engine. Check reservoir, check for fluid leak under the transmission. Bleed hydraulic cylinder after replacing seals/hoses. Towing may be necessary.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_36",
    symptom_hindi: "Engine chalne par silencer se tej tik-tik ki aawaz aa rahi hai jaise chote pathar takra rahe ho",
    symptom_english: "Tapping/clicking noise from exhaust, sounds like small stones hitting metal",
    likely_causes: ["Broken ceramic honeycomb in catalytic converter/DPF", "Loose exhaust heat shield clamping", "Broken internal muffler baffles"],
    severity: "drive",
    typical_cost_range: "₹1,500 - ₹18,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Inspect the mechanical condition of exhaust pipes, catalytic housing, and brackets. If internal catalyst matrix is broken, exhaust back-pressure may build up, lowering fuel mileage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_37",
    symptom_hindi: "Fuel injection pump ke paas se tez khat-khat ki aawaz aa rahi hai aur idle unsteady hai",
    symptom_english: "Loud clicking/metallic rattling noise from fuel injection pump, uneven idling",
    likely_causes: ["FIP plunger wear", "Internal fuel distributor timing misalignment", "Air lock in fuel rail"],
    severity: "caution",
    typical_cost_range: "₹12,000 - ₹38,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Diesel fuel injection pressure is highly critical. Do not open fuel pipes while started (high-pressure skin penetration hazard). Run engine timing diagnostics at workshop.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_38",
    symptom_hindi: "Chassis ke niche se ghun-ghun ki aawaz aa rahi hai jab overdrive me daudte hai",
    symptom_english: "Whining/droning noise from center of chassis when driving at high gears",
    likely_causes: ["Propeller shaft center support bearing worn/dry", "Misaligned transmission tail-shaft", "Universal joint dry of grease"],
    severity: "caution",
    typical_cost_range: "₹2,200 - ₹7,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Center bearing rubber cushion may have disintegrated. Plan to replace the propeller shaft center bearing. Grease all cross joints with chassis grease.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_39",
    symptom_hindi: "Power brake exhaust valve se dhum-dhum karke jhatke lag rahe hai aur pressure nahi badh raha",
    symptom_english: "Brake system compressor cycling too frequently with rapid exhaust spurts",
    likely_causes: ["Clogged air dryer cartridge", "Unloader valve assembly gummed up/faulty", "Severe leakage down-circuit"],
    severity: "caution",
    typical_cost_range: "₹2,500 - ₹8,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "The air dryer system is overloaded or leaking. Drain moisture manually from reservoir tanks using drain valves (pull cables). Replace desiccant dryer filter cartridge soon.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_40",
    symptom_hindi: "Gaadi jab thandi rehti hai tab start hone me bohot jhatka khati hai, safed smoke ata hai",
    symptom_english: "Engine shakes heavily and releases white smoke only when cold starting",
    likely_causes: ["Defective cylinder glow plugs", "Incorrect fuel injection cold-start timing", "Low cylinder head compression"],
    severity: "drive",
    typical_cost_range: "₹2,000 - ₹9,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Verify that the glow plug pre-heater light on dashboard turns off before cranking. Replace any non-functional heater plugs. If issue persists, check starter motor rotation speed.",
    acoustic_signal_class: "misfire"
  }
];
