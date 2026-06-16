var FC={apiKey:"AIzaSyCoq89tPAbfCsPfivf2X5WXDCvc_KIxCq4",authDomain:"fuel-log-mileage-tracker.firebaseapp.com",projectId:"fuel-log-mileage-tracker",storageBucket:"fuel-log-mileage-tracker.firebasestorage.app",messagingSenderId:"123148075344",appId:"1:123148075344:web:bf78041443ced5de122c55"};
firebase.initializeApp(FC);
var auth=firebase.auth(), db=firebase.firestore();
var vehicles=[], vEntries={}, vReminders={}, currentUser=null, expandedV=null, charts={};
var COLORS=['#667eea,#764ba2','#27ae60,#219a52','#f39c12,#d68910','#e74c3c,#c0392b','#1abc9c,#16a085','#8e44ad,#6c3483','#2c3e50,#4a6fa1'];

auth.onAuthStateChanged(function(u){
    document.getElementById('loadingSection').style.display='none';
    if(u){currentUser=u;document.getElementById('authSection').style.display='none';document.getElementById('app').style.display='block';document.getElementById('userEmail').textContent=u.email;loadVehicles();}
    else{currentUser=null;document.getElementById('authSection').style.display='block';document.getElementById('app').style.display='none';}
});

function showTab(t){document.getElementById('loginForm').style.display=t==='login'?'block':'none';document.getElementById('signupForm').style.display=t==='signup'?'block':'none';document.getElementById('loginTab').className='tab'+(t==='login'?' active':'');document.getElementById('signupTab').className='tab'+(t==='signup'?' active':'');document.getElementById('authErr').style.display='none';}
function loginUser(){var e=document.getElementById('loginEmail').value,p=document.getElementById('loginPassword').value,el=document.getElementById('authErr');if(!e||!p){el.textContent='Enter email and password';el.style.display='block';return;}auth.signInWithEmailAndPassword(e,p).catch(function(err){el.textContent=err.message;el.style.display='block';});}
function signupUser(){var e=document.getElementById('signupEmail').value,p=document.getElementById('signupPassword').value,c=document.getElementById('signupConfirm').value,el=document.getElementById('authErr');if(!e||!p){el.textContent='Fill all fields';el.style.display='block';return;}if(p!==c){el.textContent='Passwords do not match';el.style.display='block';return;}if(p.length<6){el.textContent='Min 6 characters';el.style.display='block';return;}auth.createUserWithEmailAndPassword(e,p).catch(function(err){el.textContent=err.message;el.style.display='block';});}
function logoutUser(){auth.signOut();vehicles=[];vEntries={};vReminders={};}

// === FULL BACKUP & RESTORE ===
function showBackupMsg(text,type){
    var el=document.getElementById('backupMsg');
    el.textContent=text;
    el.style.display='block';
    el.style.background=type==='success'?'rgba(39,174,96,0.15)':type==='error'?'rgba(231,76,60,0.15)':'rgba(52,152,219,0.15)';
    el.style.color=type==='success'?'#27ae60':type==='error'?'#e74c3c':'#3498db';
    el.style.border='1px solid '+(type==='success'?'#27ae60':type==='error'?'#e74c3c':'#3498db');
    setTimeout(function(){el.style.display='none';},5000);
}
function showRestoreConfirm(){document.getElementById('restoreConfirm').style.display='block';}
function hideRestoreConfirm(){document.getElementById('restoreConfirm').style.display='none';}

function fullBackup(){
    if(vehicles.length===0){showBackupMsg('No data to backup!','error');return;}
    var backup={version:2,exportDate:new Date().toISOString(),vehicles:[]};
    vehicles.forEach(function(v){
        var vData={icon:v.icon,name:v.name,fuelType:v.fuelType,entries:vEntries[v.id]||[],reminders:vReminders[v.id]||[]};
        vData.entries=vData.entries.map(function(e){return{date:e.date,odometer:e.odometer,price:e.price,qty:e.qty,fuelType:e.fuelType,distance:e.distance,mileage:e.mileage,totalCost:e.totalCost};});
        vData.reminders=vData.reminders.map(function(r){return{dueDate:r.dueDate,message:r.message,done:r.done};});
        backup.vehicles.push(vData);
    });
    var json=JSON.stringify(backup,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='FuelTracker_FullBackup_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    showBackupMsg('✅ Backup downloaded! ('+vehicles.length+' vehicles, all entries & reminders)','success');
}

function fullRestore(){
    hideRestoreConfirm();
    var input=document.createElement('input');
    input.type='file';input.accept='.json';
    input.onchange=function(event){
        var file=event.target.files[0];if(!file)return;
        showBackupMsg('⏳ Restoring data...','info');
        var reader=new FileReader();
        reader.onload=function(e){
            try{
                var backup=JSON.parse(e.target.result);
                if(!backup.vehicles||!Array.isArray(backup.vehicles)){showBackupMsg('❌ Invalid backup file!','error');return;}
                var count=0;
                var promises=[];
                backup.vehicles.forEach(function(vData){
                    var v={icon:vData.icon||'🚗',name:vData.name||'Vehicle',fuelType:vData.fuelType||'Petrol/Diesel',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
                    promises.push(vehiclesRef().add(v).then(function(ref){
                        var vid=ref.id;
                        var entryPromises=[];
                        if(vData.entries&&vData.entries.length>0){
                            vData.entries.forEach(function(entry){
                                entryPromises.push(entriesRef(vid).add({date:entry.date,odometer:entry.odometer,price:entry.price,qty:entry.qty,fuelType:entry.fuelType||'Petrol/Diesel',distance:entry.distance||0,mileage:entry.mileage||0,totalCost:entry.totalCost||0}));
                            });
                        }
                        if(vData.reminders&&vData.reminders.length>0){
                            vData.reminders.forEach(function(rem){
                                entryPromises.push(remindersRef(vid).add({dueDate:rem.dueDate,message:rem.message,done:rem.done||false,createdAt:firebase.firestore.FieldValue.serverTimestamp()}));
                            });
                        }
                        count++;
                        return Promise.all(entryPromises);
                    }));
                });
                Promise.all(promises).then(function(){
                    showBackupMsg('✅ Restored '+count+' vehicles successfully! Reloading...','success');
                    setTimeout(function(){loadVehicles();},1500);
                });
            }catch(err){showBackupMsg('❌ Error: '+err.message,'error');}
        };
        reader.readAsText(file);
    };
    input.click();
}
function userDoc(){return db.collection('users').doc(currentUser.uid);}
function vehiclesRef(){return userDoc().collection('vehicles');}
function entriesRef(vid){return vehiclesRef().doc(vid).collection('entries');}

function loadVehicles(){
    vehiclesRef().orderBy('createdAt','asc').get().then(function(snap){
        vehicles=[];vEntries={};vReminders={};
        snap.forEach(function(d){var v=d.data();v.id=d.id;vehicles.push(v);vEntries[v.id]=[];vReminders[v.id]=[];});
        if(vehicles.length>0&&!expandedV)expandedV=vehicles[0].id;
        var promises=[];
        vehicles.forEach(function(v){promises.push(loadEntries(v.id));promises.push(loadReminders(v.id));});
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

// === REMINDERS ===
function remindersRef(vid){return vehiclesRef().doc(vid).collection('reminders');}

function loadReminders(vid){
    return remindersRef(vid).orderBy('dueDate','asc').get().then(function(snap){
        vReminders[vid]=[];
        snap.forEach(function(d){var r=d.data();r.id=d.id;vReminders[vid].push(r);});
    });
}

function addReminder(vid){
    var date=document.getElementById('rem_date_'+vid).value;
    var msg=document.getElementById('rem_msg_'+vid).value.trim();
    if(!date||!msg){alert('Enter both date and message');return;}
    var rem={dueDate:date,message:msg,done:false,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    remindersRef(vid).add(rem).then(function(ref){
        rem.id=ref.id;
        if(!vReminders[vid])vReminders[vid]=[];
        vReminders[vid].push(rem);
        vReminders[vid].sort(function(a,b){return(a.dueDate||'').localeCompare(b.dueDate||'');});
        renderAll();
    });
}

function delReminder(vid,rid){
    if(!confirm('Delete this reminder?'))return;
    remindersRef(vid).doc(rid).delete().then(function(){
        vReminders[vid]=vReminders[vid].filter(function(r){return r.id!==rid;});
        renderAll();
    });
}

function editReminder(vid,rid){
    var rem=vReminders[vid].find(function(r){return r.id===rid;});
    if(!rem)return;
    // Find the reminder div and replace with inline edit form
    var remDivs=document.querySelectorAll('[data-rem-id]');
    var targetDiv=document.querySelector('[data-rem-id="'+rid+'"]');
    if(!targetDiv){
        // Fallback: find by iterating
        var allRemDivs=document.querySelectorAll('.rem-item');
        var idx=vReminders[vid].findIndex(function(r){return r.id===rid;});
        if(idx>=0&&allRemDivs[idx]) targetDiv=allRemDivs[idx];
    }
    if(!targetDiv) return;
    targetDiv.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%"><input type="date" id="edrem_date_'+rid+'" value="'+rem.dueDate+'" style="padding:6px;border:2px solid #3498db;border-radius:6px;font-size:0.85em"><input type="text" id="edrem_msg_'+rid+'" value="'+rem.message+'" style="flex:1;padding:6px;border:2px solid #3498db;border-radius:6px;font-size:0.85em;min-width:150px"><button onclick="saveRemEdit(\''+vid+'\',\''+rid+'\')" style="background:#27ae60;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600">✓ Save</button><button onclick="renderAll()" style="background:#999;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600">✗ Cancel</button></div>';
}

function saveRemEdit(vid,rid){
    var newDate=document.getElementById('edrem_date_'+rid).value;
    var newMsg=document.getElementById('edrem_msg_'+rid).value.trim();
    if(!newDate||!newMsg){alert('Fill both date and message');return;}
    var rem=vReminders[vid].find(function(r){return r.id===rid;});
    if(!rem)return;
    rem.message=newMsg;rem.dueDate=newDate;
    remindersRef(vid).doc(rid).update({message:newMsg,dueDate:newDate});
    vReminders[vid].sort(function(a,b){return(a.dueDate||'').localeCompare(b.dueDate||'');});
    renderAll();
}

function toggleRemDone(vid,rid){
    var rem=vReminders[vid].find(function(r){return r.id===rid;});
    if(!rem)return;
    rem.done=!rem.done;
    remindersRef(vid).doc(rid).update({done:rem.done});
    renderAll();
}

function buildReminders(vid){
    var rems=vReminders[vid]||[];
    if(rems.length===0) return '<p style="color:#999;text-align:center;padding:10px;font-size:0.85em">No reminders set.</p>';
    var today=new Date().toISOString().slice(0,10);
    var s='<div style="margin-top:12px">';
    rems.forEach(function(r){
        var isOverdue=!r.done&&r.dueDate<today;
        var isDueToday=!r.done&&r.dueDate===today;
        var isDone=r.done;
        var bg=isDone?'#f0f0f0':isOverdue?'#ffeaea':isDueToday?'#fff8e6':'#f0f8ff';
        var border=isDone?'#ddd':isOverdue?'#e74c3c':isDueToday?'#f39c12':'#3498db';
        var icon=isDone?'✅':isOverdue?'🚨':isDueToday?'⚠️':'🔔';
        var statusText=isDone?'Done':isOverdue?'OVERDUE':isDueToday?'Due Today':'Upcoming';
        var statusColor=isDone?'#27ae60':isOverdue?'#e74c3c':isDueToday?'#f39c12':'#3498db';
        s+='<div class="rem-item" data-rem-id="'+r.id+'" style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:8px;border-radius:8px;background:'+bg+';border-left:4px solid '+border+'">';
        s+='<span style="font-size:1.2em">'+icon+'</span>';
        s+='<div style="flex:1"><div style="font-weight:600;font-size:0.88em;'+(isDone?'text-decoration:line-through;color:#999':'')+'">'+r.message+'</div>';
        s+='<div style="font-size:0.75em;color:#777">📅 '+fmtDate(r.dueDate)+' <span style="color:'+statusColor+';font-weight:600;margin-left:6px">'+statusText+'</span></div></div>';
        s+='<button onclick="editReminder(\''+vid+'\',\''+r.id+'\')" style="background:#3498db;color:white;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:0.75em">✎</button>';
        s+='<button onclick="toggleRemDone(\''+vid+'\',\''+r.id+'\')" style="background:'+(isDone?'#999':'#27ae60')+';color:white;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:0.75em">'+(isDone?'Undo':'Done')+'</button>';
        s+='<button onclick="delReminder(\''+vid+'\',\''+r.id+'\')" style="background:#e74c3c;color:white;border:none;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:0.75em">🗑</button>';
        s+='</div>';
    });
    s+='</div>';
    return s;
}

// === PUSH NOTIFICATIONS WITH SERVICE WORKER ===
var swRegistration=null;

function registerServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('firebase-messaging-sw.js').then(function(reg){
        swRegistration=reg;
        console.log('Service Worker registered');
    }).catch(function(err){
        console.log('SW registration failed:',err);
    });
}

function requestNotificationPermission(){
    if(!('Notification' in window))return;
    if(Notification.permission==='default'){
        Notification.requestPermission().then(function(permission){
            if(permission==='granted'){
                console.log('Notifications enabled');
                checkAndNotifyReminders();
            }
        });
    }
}

function checkAndNotifyReminders(){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    var today=new Date().toISOString().slice(0,10);
    var notified=JSON.parse(localStorage.getItem('notifiedReminders')||'{}');
    var pendingReminders=[];
    
    vehicles.forEach(function(v){
        var rems=vReminders[v.id]||[];
        rems.forEach(function(r){
            if(r.done)return;
            var key=r.id+'_'+today;
            if(notified[key])return;
            if(r.dueDate<=today){
                pendingReminders.push({id:r.id,dueDate:r.dueDate,message:r.message,vehicleName:v.icon+' '+v.name,done:r.done});
                notified[key]=true;
            }
        });
    });
    
    if(pendingReminders.length>0){
        // Try Service Worker notifications (works in background)
        if(swRegistration&&swRegistration.active){
            swRegistration.active.postMessage({type:'CHECK_REMINDERS',reminders:pendingReminders});
        }else{
            // Fallback to regular notifications
            pendingReminders.forEach(function(r){
                var isOverdue=r.dueDate<today;
                var title=isOverdue?'🚨 OVERDUE - '+r.vehicleName:'⚠️ Due Today - '+r.vehicleName;
                var body=isOverdue?r.message+' (Due: '+r.dueDate+')':r.message;
                new Notification(title,{body:body,tag:'rem-'+r.id});
            });
        }
    }
    
    localStorage.setItem('notifiedReminders',JSON.stringify(notified));
}

// === THEME TOGGLE (Batman Dark Mode) ===
function toggleTheme(){
    document.body.classList.toggle('batman');
    var isBatman=document.body.classList.contains('batman');
    localStorage.setItem('fuelTheme',isBatman?'batman':'light');
    document.getElementById('themeBtn').textContent=isBatman?'☀️':'🦇';
    document.title=isBatman?'⛽ Fuel Tracker 🦇 Dark Knight Mode':'⛽ Fuel Log & Mileage Tracker';
    // Re-render charts with appropriate colors
    if(expandedV) setTimeout(function(){renderChartsFor(expandedV);},100);
}
function loadTheme(){
    var saved=localStorage.getItem('fuelTheme');
    if(saved==='batman'){
        document.body.classList.add('batman');
        var btn=document.getElementById('themeBtn');
        if(btn) btn.textContent='☀️';
        document.title='⛽ Fuel Tracker 🦇 Dark Knight Mode';
    }
}
loadTheme();

// Initialize notifications
setTimeout(function(){
    registerServiceWorker();
    requestNotificationPermission();
},2000);

// Check reminders every 60 seconds (Service Worker keeps it alive in background)
setInterval(function(){if(currentUser&&vehicles.length>0)checkAndNotifyReminders();},60000);
// Also check immediately after data loads
setTimeout(function(){if(currentUser&&vehicles.length>0)checkAndNotifyReminders();},5000);
