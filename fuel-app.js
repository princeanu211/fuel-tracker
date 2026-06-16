var FC={apiKey:"AIzaSyCoq89tPAbfCsPfivf2X5WXDCvc_KIxCq4",authDomain:"fuel-log-mileage-tracker.firebaseapp.com",projectId:"fuel-log-mileage-tracker",storageBucket:"fuel-log-mileage-tracker.firebasestorage.app",messagingSenderId:"123148075344",appId:"1:123148075344:web:bf78041443ced5de122c55"};
firebase.initializeApp(FC);
var auth=firebase.auth(), db=firebase.firestore();
var vehicles=[], vEntries={}, currentUser=null, expandedV=null, charts={};
var COLORS=['#667eea,#764ba2','#27ae60,#219a52','#f39c12,#d68910','#e74c3c,#c0392b','#1abc9c,#16a085','#8e44ad,#6c3483','#2c3e50,#4a6fa1'];

auth.onAuthStateChanged(function(u){
    document.getElementById('loadingSection').style.display='none';
    if(u){currentUser=u;document.getElementById('authSection').style.display='none';document.getElementById('app').style.display='block';document.getElementById('userEmail').textContent=u.email;loadVehicles();}
    else{currentUser=null;document.getElementById('authSection').style.display='block';document.getElementById('app').style.display='none';}
});

function showTab(t){document.getElementById('loginForm').style.display=t==='login'?'block':'none';document.getElementById('signupForm').style.display=t==='signup'?'block':'none';document.getElementById('loginTab').className='tab'+(t==='login'?' active':'');document.getElementById('signupTab').className='tab'+(t==='signup'?' active':'');document.getElementById('authErr').style.display='none';}
function loginUser(){var e=document.getElementById('loginEmail').value,p=document.getElementById('loginPassword').value,el=document.getElementById('authErr');if(!e||!p){el.textContent='Enter email and password';el.style.display='block';return;}auth.signInWithEmailAndPassword(e,p).catch(function(err){el.textContent=err.message;el.style.display='block';});}
function signupUser(){var e=document.getElementById('signupEmail').value,p=document.getElementById('signupPassword').value,c=document.getElementById('signupConfirm').value,el=document.getElementById('authErr');if(!e||!p){el.textContent='Fill all fields';el.style.display='block';return;}if(p!==c){el.textContent='Passwords do not match';el.style.display='block';return;}if(p.length<6){el.textContent='Min 6 characters';el.style.display='block';return;}auth.createUserWithEmailAndPassword(e,p).catch(function(err){el.textContent=err.message;el.style.display='block';});}
function logoutUser(){auth.signOut();vehicles=[];vEntries={};}
function userDoc(){return db.collection('users').doc(currentUser.uid);}
function vehiclesRef(){return userDoc().collection('vehicles');}
function entriesRef(vid){return vehiclesRef().doc(vid).collection('entries');}

function loadVehicles(){
    vehiclesRef().orderBy('createdAt','asc').get().then(function(snap){
        vehicles=[];vEntries={};
        snap.forEach(function(d){var v=d.data();v.id=d.id;vehicles.push(v);vEntries[v.id]=[];});
        if(vehicles.length>0&&!expandedV)expandedV=vehicles[0].id;
        var promises=vehicles.map(function(v){return loadEntries(v.id);});
        Promise.all(promises).then(function(){renderAll();});
    });
}
function loadEntries(vid){
    return entriesRef(vid).orderBy('odometer','asc').get().then(function(snap){
        vEntries[vid]=[];snap.forEach(function(d){var e=d.data();e.id=d.id;vEntries[vid].push(e);});recalc(vid);
    });
}
function recalc(vid){
    var h=vEntries[vid];
    for(var i=0;i<h.length;i++){
        if(i===0){h[i].distance=0;h[i].mileage=0;}
        else{h[i].distance=h[i].odometer-h[i-1].odometer;h[i].mileage=h[i].distance/h[i].qty;}
        h[i].totalCost=h[i].price*h[i].qty;
    }
}
function addVehicle(){
    var icon=document.getElementById('nvIcon').value,name=document.getElementById('nvName').value.trim(),fuel=document.getElementById('nvFuel').value;
    if(!name){alert('Enter vehicle name');return;}
    var v={icon:icon,name:name,fuelType:fuel,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    vehiclesRef().add(v).then(function(ref){v.id=ref.id;vehicles.push(v);vEntries[v.id]=[];expandedV=v.id;document.getElementById('nvName').value='';renderAll();});
}
function removeVehicle(vid){
    if(!confirm('Delete vehicle and ALL entries?'))return;
    entriesRef(vid).get().then(function(snap){var batch=db.batch();snap.forEach(function(d){batch.delete(d.ref);});batch.delete(vehiclesRef().doc(vid));return batch.commit();}).then(function(){vehicles=vehicles.filter(function(v){return v.id!==vid;});delete vEntries[vid];if(expandedV===vid)expandedV=vehicles.length>0?vehicles[0].id:null;renderAll();});
}
function toggleVehicle(vid){expandedV=(expandedV===vid)?null:vid;renderAll();}
function getUnit(ft){return{'Petrol/Diesel':'L','CNG':'Kg','Electric':'kWh'}[ft||'Petrol/Diesel']||'L';}
function fmtDate(s){
    if(!s) return '-';
    // Handle Excel serial number dates
    if(typeof s==='number'){
        var d=new Date((s-25569)*86400000);
        var yr=d.getUTCFullYear(),mn=d.getUTCMonth(),dy=d.getUTCDate();
        return new Date(yr,mn,dy).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    }
    // For string dates like "2026-04-12", parse parts to avoid timezone shift
    if(typeof s==='string' && s.match(/^\d{4}-\d{2}-\d{2}$/)){
        var parts=s.split('-');
        var d=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
        return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    }
    var d=new Date(s);
    if(isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function getStats(vid){
    var h=vEntries[vid]||[],wm=h.filter(function(e){return e.mileage>0;}),avg=0,last=0,dist=0,spend=0;
    if(wm.length>0){var s=0;wm.forEach(function(e){s+=e.mileage;});avg=s/wm.length;last=wm[wm.length-1].mileage;}
    h.forEach(function(e){dist+=(e.distance||0);spend+=(e.totalCost||0);});
    return{avg:avg,last:last,dist:dist,spend:spend,entries:h.length};
}
function updUnit(vid){var ft=document.getElementById('fuel_'+vid).value,u=getUnit(ft);document.getElementById('pu_'+vid).textContent=u;document.getElementById('qu_'+vid).textContent=u;}
function addEntry(vid){
    var date=document.getElementById('date_'+vid).value,odo=parseFloat(document.getElementById('odo_'+vid).value),price=parseFloat(document.getElementById('price_'+vid).value),qty=parseFloat(document.getElementById('qty_'+vid).value),el=document.getElementById('err_'+vid),ft=document.getElementById('fuel_'+vid).value;
    if(!date||isNaN(odo)||isNaN(price)||isNaN(qty)||odo<0||price<=0||qty<=0){el.textContent='Fill all fields with valid values';el.style.display='block';return;}
    var h=vEntries[vid];
    if(h.length>0&&odo<=h[h.length-1].odometer){el.textContent='Odometer must be > last ('+h[h.length-1].odometer+')';el.style.display='block';return;}
    el.style.display='none';
    var dist=0,mil=0;if(h.length>0){dist=odo-h[h.length-1].odometer;mil=dist/qty;}
    var entry={date:date,odometer:odo,price:price,qty:qty,distance:dist,mileage:mil,totalCost:price*qty,fuelType:ft};
    entriesRef(vid).add(entry).then(function(ref){entry.id=ref.id;h.push(entry);recalc(vid);renderAll();document.getElementById('odo_'+vid).value='';document.getElementById('price_'+vid).value='';document.getElementById('qty_'+vid).value='';});
}
function delEntry(vid,idx){
    if(!confirm('Delete this entry?'))return;
    var e=vEntries[vid][idx];
    if(e.id){entriesRef(vid).doc(e.id).delete().then(function(){vEntries[vid].splice(idx,1);recalc(vid);renderAll();});}
}
function editEntry(vid,idx){
    var h=vEntries[vid];var e=h[idx];
    var tbl=document.querySelector('#vList .tbl-wrap tbody');if(!tbl)return;
    var row=tbl.rows[idx];if(!row)return;
    var ft=e.fuelType||'Petrol/Diesel';
    row.innerHTML='<td>'+(idx+1)+'</td><td><input type="date" id="ed_date_'+vid+'" value="'+e.date+'" style="padding:4px;border:1px solid #667eea;border-radius:4px;font-size:0.85em;width:100%"></td><td><select id="ed_fuel_'+vid+'" style="padding:3px;border:1px solid #667eea;border-radius:4px;font-size:0.78em"><option value="Petrol/Diesel"'+(ft==='Petrol/Diesel'?' selected':'')+'>P/D</option><option value="CNG"'+(ft==='CNG'?' selected':'')+'>CNG</option><option value="Electric"'+(ft==='Electric'?' selected':'')+'>EV</option></select></td><td><input type="number" id="ed_odo_'+vid+'" value="'+e.odometer+'" style="width:70px;padding:4px;border:1px solid #667eea;border-radius:4px;font-size:0.85em"></td><td>-</td><td><input type="number" id="ed_qty_'+vid+'" value="'+e.qty+'" step="0.1" style="width:55px;padding:4px;border:1px solid #667eea;border-radius:4px;font-size:0.85em"></td><td><input type="number" id="ed_price_'+vid+'" value="'+e.price+'" step="0.01" style="width:65px;padding:4px;border:1px solid #667eea;border-radius:4px;font-size:0.85em"></td><td>-</td><td>-</td><td style="white-space:nowrap"><button class="act-btn" style="background:#27ae60" onclick="saveEdit(\''+vid+'\','+idx+')">✓</button><button class="act-btn" style="background:#999" onclick="renderAll()">✗</button></td>';
}
function saveEdit(vid,idx){
    var d=document.getElementById('ed_date_'+vid).value,o=parseFloat(document.getElementById('ed_odo_'+vid).value),p=parseFloat(document.getElementById('ed_price_'+vid).value),q=parseFloat(document.getElementById('ed_qty_'+vid).value),ft=document.getElementById('ed_fuel_'+vid).value;
    if(!d||isNaN(o)||isNaN(p)||isNaN(q)||o<0||p<=0||q<=0){alert('Invalid values!');return;}
    var e=vEntries[vid][idx];
    e.date=d;e.odometer=o;e.price=p;e.qty=q;e.fuelType=ft;
    vEntries[vid].sort(function(a,b){return a.odometer-b.odometer;});
    recalc(vid);
    if(e.id){entriesRef(vid).doc(e.id).update({date:d,odometer:o,price:p,qty:q,fuelType:ft});}
    renderAll();
}
function insertEntry(vid,idx){
    var tbl=document.querySelector('#vList .tbl-wrap tbody');if(!tbl)return;
    var newRow=tbl.insertRow(idx);
    newRow.style.background='#f0f4ff';
    newRow.innerHTML='<td style="color:#8e44ad;font-weight:bold">NEW</td><td><input type="date" id="ins_date_'+vid+'" style="padding:4px;border:1px solid #8e44ad;border-radius:4px;font-size:0.85em;width:100%"></td><td><select id="ins_fuel_'+vid+'" style="padding:3px;border:1px solid #8e44ad;border-radius:4px;font-size:0.78em"><option value="Petrol/Diesel">P/D</option><option value="CNG">CNG</option><option value="Electric">EV</option></select></td><td><input type="number" id="ins_odo_'+vid+'" placeholder="Odo" style="width:70px;padding:4px;border:1px solid #8e44ad;border-radius:4px;font-size:0.85em"></td><td>-</td><td><input type="number" id="ins_qty_'+vid+'" placeholder="Qty" step="0.1" style="width:55px;padding:4px;border:1px solid #8e44ad;border-radius:4px;font-size:0.85em"></td><td><input type="number" id="ins_price_'+vid+'" placeholder="Price" step="0.01" style="width:65px;padding:4px;border:1px solid #8e44ad;border-radius:4px;font-size:0.85em"></td><td>-</td><td>-</td><td style="white-space:nowrap"><button class="act-btn" style="background:#27ae60" onclick="saveInsert(\''+vid+'\')">✓</button><button class="act-btn" style="background:#999" onclick="renderAll()">✗</button></td>';
}
function saveInsert(vid){
    var d=document.getElementById('ins_date_'+vid).value,o=parseFloat(document.getElementById('ins_odo_'+vid).value),p=parseFloat(document.getElementById('ins_price_'+vid).value),q=parseFloat(document.getElementById('ins_qty_'+vid).value),ft=document.getElementById('ins_fuel_'+vid).value;
    if(!d||isNaN(o)||isNaN(p)||isNaN(q)||o<0||p<=0||q<=0){alert('Fill all fields with valid values!');return;}
    var entry={date:d,odometer:o,price:p,qty:q,distance:0,mileage:0,totalCost:p*q,fuelType:ft};
    entriesRef(vid).add(entry).then(function(ref){entry.id=ref.id;vEntries[vid].push(entry);vEntries[vid].sort(function(a,b){return a.odometer-b.odometer;});recalc(vid);renderAll();});
}
function clearV(vid){
    if(!confirm('Delete ALL entries for this vehicle?'))return;
    var batch=db.batch();vEntries[vid].forEach(function(e){if(e.id)batch.delete(entriesRef(vid).doc(e.id));});
    batch.commit().then(function(){vEntries[vid]=[];renderAll();});
}
function exportV(vid){
    var h=vEntries[vid],v=vehicles.find(function(x){return x.id===vid;});
    if(!h||h.length===0){alert('No data!');return;}
    var exp=h.map(function(e,i){return{'#':i+1,Date:e.date,'Fuel Type':e.fuelType||'Petrol/Diesel',Odometer:e.odometer,Distance:e.distance||0,Qty:e.qty,Price:e.price,Total:parseFloat(e.totalCost.toFixed(2)),Mileage:e.mileage>0?parseFloat(e.mileage.toFixed(2)):'N/A'};});
    var ws=XLSX.utils.json_to_sheet(exp),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Fuel Log');
    XLSX.writeFile(wb,(v?v.name:'Vehicle')+'_FuelLog_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
function importV(vid){document.getElementById('file_'+vid).click();}
function parseExcelDate(val){
    if(!val) return null;
    // Already a proper date string like "2025-08-15"
    if(typeof val==='string'){
        if(val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
        var d=new Date(val);
        if(!isNaN(d.getTime())){
            var yr=d.getFullYear(),mn=String(d.getMonth()+1).padStart(2,'0'),dy=String(d.getDate()).padStart(2,'0');
            return yr+'-'+mn+'-'+dy;
        }
        return val;
    }
    // Excel serial number date - use UTC to avoid timezone shift
    if(typeof val==='number'){
        var ms=(val-25569)*86400000;
        var d=new Date(ms);
        var yr=d.getUTCFullYear(),mn=String(d.getUTCMonth()+1).padStart(2,'0'),dy=String(d.getUTCDate()).padStart(2,'0');
        return yr+'-'+mn+'-'+dy;
    }
    return null;
}
function handleImport(event,vid){
    var file=event.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
        var data=new Uint8Array(e.target.result),wb=XLSX.read(data,{type:'array',cellDates:false}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]),count=0,promises=[];
        rows.forEach(function(row){
            var dateRaw=row['Date'];
            var date=parseExcelDate(dateRaw);
            var odo=parseFloat(row['Odometer']),qty=parseFloat(row['Qty']||row['Qty (L)']),price=parseFloat(row['Price']||row['Price/L']),ft=row['Fuel Type']||'Petrol/Diesel';
            if(date&&!isNaN(odo)&&!isNaN(qty)&&!isNaN(price)){var entry={date:date,odometer:odo,price:price,qty:qty,distance:0,mileage:0,totalCost:price*qty,fuelType:ft};promises.push(entriesRef(vid).add(entry).then(function(ref){entry.id=ref.id;vEntries[vid].push(entry);count++;}));}
        });
        Promise.all(promises).then(function(){vEntries[vid].sort(function(a,b){return a.odometer-b.odometer;});recalc(vid);renderAll();alert('Imported '+count+' entries!');});
        event.target.value='';
    };reader.readAsArrayBuffer(file);
}
