function renderAll(){
    var scrollY=window.scrollY||window.pageYOffset;
    var tblWrap=document.querySelector('.tbl-wrap');
    var tblScrollTop=tblWrap?tblWrap.scrollTop:0;
    var container=document.getElementById('vList');
    container.innerHTML='';
    if(vehicles.length===0){
        container.innerHTML='<div style="text-align:center;color:#aaa;padding:40px;background:rgba(255,255,255,0.05);border-radius:12px;">No vehicles added yet. Add one above to start tracking!</div>';
        return;
    }
    vehicles.forEach(function(v,idx){
        var stats=getStats(v.id);
        var unit=getUnit(v.fuelType);
        var isExp=(expandedV===v.id);
        var col=COLORS[idx%COLORS.length];
        var acc=document.createElement('div');
        acc.className='vacc';
        var hdr=document.createElement('div');
        hdr.className='vhdr';
        hdr.style.background='linear-gradient(135deg,'+col+')';
        hdr.setAttribute('onclick','toggleVehicle("'+v.id+'")');
        var avgText=stats.avg>0?stats.avg.toFixed(1)+' km/'+unit:'--';
        var lastText=stats.last>0?stats.last.toFixed(1)+' km/'+unit:'--';
        hdr.innerHTML='<div class="vtitle">'+v.icon+' '+v.name+'</div><div class="vsum"><span>📊 '+avgText+'</span><span>🏁 '+lastText+'</span><span>📝 '+stats.entries+'</span><span class="eicon'+(isExp?' exp':'')+'">▼</span></div>';
        acc.appendChild(hdr);
        var body=document.createElement('div');
        body.className='vbody'+(isExp?' exp':'');
        if(isExp) body.innerHTML=buildBody(v);
        acc.appendChild(body);
        container.appendChild(acc);
    });
    setTimeout(function(){
        window.scrollTo(0,scrollY);
        var newTblWrap=document.querySelector('.tbl-wrap');
        if(newTblWrap && tblScrollTop) newTblWrap.scrollTop=tblScrollTop;
        if(expandedV) renderChartsFor(expandedV);
    },50);
}

function buildBody(v){
    var vid=v.id, h=vEntries[vid]||[], stats=getStats(vid), unit=getUnit(v.fuelType);
    var s='';
    // Stats
    s+='<div class="stats-row">';
    s+='<div class="stat-card"><div class="sv">'+(stats.avg>0?stats.avg.toFixed(1)+' km/'+unit:'--')+'</div><div class="sl">📊 Avg Mileage</div></div>';
    s+='<div class="stat-card green"><div class="sv">'+(stats.last>0?stats.last.toFixed(1)+' km/'+unit:'--')+'</div><div class="sl">🏁 Last Mileage</div></div>';
    s+='<div class="stat-card" style="background:linear-gradient(135deg,#f39c12,#e67e22)"><div class="sv">'+stats.dist.toLocaleString()+' km</div><div class="sl">🛣️ Total Distance</div></div>';
    s+='</div>';
    // Form
    s+='<div class="card"><h2>➕ Add Fuel Entry</h2><div class="input-row">';
    s+='<div class="input-group"><label>📅 Date</label><input type="date" id="date_'+vid+'" value="'+new Date().toISOString().slice(0,10)+'"></div>';
    s+='<div class="input-group"><label>🔢 Odometer</label><input type="number" id="odo_'+vid+'" placeholder="e.g. 25430"></div>';
    s+='<div class="input-group"><label>⛽ Fuel</label><select id="fuel_'+vid+'" onchange="updUnit(\''+vid+'\')">';
    s+='<option value="Petrol/Diesel"'+(v.fuelType==='Petrol/Diesel'?' selected':'')+'>⛽ P/D</option>';
    s+='<option value="CNG"'+(v.fuelType==='CNG'?' selected':'')+'>💨 CNG</option>';
    s+='<option value="Electric"'+(v.fuelType==='Electric'?' selected':'')+'>⚡ EV</option></select></div>';
    s+='<div class="input-group"><label>💰 ₹/<span id="pu_'+vid+'">'+unit+'</span></label><input type="number" id="price_'+vid+'" placeholder="105" step="0.01"></div>';
    s+='<div class="input-group"><label>🔋 <span id="qu_'+vid+'">'+unit+'</span></label><input type="number" id="qty_'+vid+'" placeholder="30" step="0.01"></div>';
    s+='</div><div class="btn-row">';
    s+='<button class="btn btn-primary" onclick="addEntry(\''+vid+'\')">💾 Save</button>';
    s+='<button class="btn btn-success" onclick="exportV(\''+vid+'\')">📥 Excel</button>';
    s+='<button class="btn btn-info" onclick="importV(\''+vid+'\')">📤 Import</button>';
    s+='<button class="btn btn-danger" onclick="clearV(\''+vid+'\')">🗑️ Clear</button>';
    s+='<button class="del-v" onclick="event.stopPropagation();removeVehicle(\''+vid+'\')" style="margin-left:auto">🗑 Delete Vehicle</button>';
    s+='</div><input type="file" id="file_'+vid+'" accept=".xlsx,.xls" style="display:none" onchange="handleImport(event,\''+vid+'\')">';
    s+='<p class="error" id="err_'+vid+'"></p></div>';
    // Reminders
    s+='<div class="card"><h2>🔔 Reminders</h2>';
    s+='<div class="rem-form"><div class="input-row">';
    s+='<div class="input-group"><label>📅 Due Date</label><input type="date" id="rem_date_'+vid+'"></div>';
    s+='<div class="input-group" style="flex:2"><label>📝 Message</label><input type="text" id="rem_msg_'+vid+'" placeholder="e.g. Service due, Insurance renewal, PUC..."></div>';
    s+='<div class="input-group" style="flex:0;min-width:auto"><label>&nbsp;</label><button class="btn btn-primary" onclick="addReminder(\''+vid+'\')" style="padding:8px 12px;font-size:0.82em">+ Add</button></div>';
    s+='</div></div>';
    s+=buildReminders(vid);
    s+='</div>';
    // Charts
    s+='<div class="card"><h2>📈 Mileage Trend</h2><div class="chart-box"><canvas id="ch1_'+vid+'"></canvas></div></div>';
    s+='<div class="card"><h2>💰 Cost/KM Monthly</h2><div class="chart-box"><canvas id="ch2_'+vid+'"></canvas></div></div>';
    s+='<div class="card"><h2>🛣️ Monthly Distance & 💸 Fuel Spend</h2><div class="chart-box"><canvas id="ch3_'+vid+'"></canvas></div></div>';
    // Table - Show latest entries on top (reverse order)
    s+='<div class="card"><h2>📋 Fill-up History</h2>';
    if(h.length===0){s+='<p style="color:#999;text-align:center;padding:15px">No entries yet.</p>';}
    else{
        // === RANGE STATISTICS - Entry comparison controls ===
        s+='<div class="range-stats-section" style="margin-bottom:16px;padding:14px;background:linear-gradient(135deg,rgba(102,126,234,0.05),rgba(118,75,162,0.05));border-radius:12px;border:1px solid rgba(102,126,234,0.2);">';
        s+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">';
        s+='<span style="font-weight:700;font-size:0.9em;color:#667eea;">📊 Range Statistics:</span>';
        s+='<select id="rangeFrom_'+vid+'" style="padding:6px 10px;border:2px solid #667eea;border-radius:8px;font-size:0.82em;background:rgba(102,126,234,0.05);min-width:160px;cursor:pointer;">';
        s+='<option value="">-- From Entry --</option>';
        for(var ri=0;ri<h.length;ri++){s+='<option value="'+ri+'">#'+(ri+1)+' - '+fmtDate(h[ri].date)+' ('+h[ri].odometer.toLocaleString()+' km)</option>';}
        s+='</select>';
        s+='<span style="font-size:1em;color:#764ba2;font-weight:bold;">→</span>';
        s+='<select id="rangeTo_'+vid+'" style="padding:6px 10px;border:2px solid #667eea;border-radius:8px;font-size:0.82em;background:rgba(102,126,234,0.05);min-width:160px;cursor:pointer;">';
        s+='<option value="">-- To Entry --</option>';
        for(var ri2=0;ri2<h.length;ri2++){s+='<option value="'+ri2+'">#'+(ri2+1)+' - '+fmtDate(h[ri2].date)+' ('+h[ri2].odometer.toLocaleString()+' km)</option>';}
        s+='</select>';
        s+='<button class="btn btn-primary" onclick="showRangeStats(\''+vid+'\')" style="padding:7px 16px;font-size:0.82em;border-radius:8px;">📊 Compare</button>';
        s+='<button class="btn" onclick="clearRangeStats(\''+vid+'\')" style="padding:7px 12px;font-size:0.82em;background:#95a5a6;color:white;border:none;border-radius:8px;cursor:pointer;">✕ Clear</button>';
        s+='</div>';
        s+='<div id="rangeResult_'+vid+'"></div>';
        s+='</div>';

        s+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Date</th><th>Fuel</th><th>Odometer</th><th>Distance</th><th>Qty</th><th>Price</th><th>Total ₹</th><th>Mileage</th><th>Action</th></tr></thead><tbody>';
        for(var i=h.length-1;i>=0;i--){
            var e=h[i];
            var fu=getUnit(e.fuelType);
            s+='<tr><td>'+(i+1)+'</td><td>'+fmtDate(e.date)+'</td><td>'+(e.fuelType||'P/D')+'</td>';
            s+='<td>'+e.odometer.toLocaleString()+'</td><td>'+(e.distance>0?e.distance+' km':'-')+'</td>';
            s+='<td>'+e.qty.toFixed(1)+' '+fu+'</td><td>₹'+e.price.toFixed(2)+'/'+fu+'</td><td>₹'+e.totalCost.toFixed(0)+'</td>';
            s+='<td>'+(e.mileage>0?e.mileage.toFixed(2)+' km/'+fu:'-')+'</td>';
            s+='<td style="white-space:nowrap"><button class="act-btn act-insert" onclick="insertEntry(\''+vid+'\','+i+')" title="Insert above">+</button><button class="act-btn act-edit" onclick="editEntry(\''+vid+'\','+i+')" title="Edit">✎</button><button class="act-btn act-del" onclick="delEntry(\''+vid+'\','+i+')" title="Delete">✕</button></td></tr>';
        }
        s+='</tbody></table></div>';
    }
    s+='</div>';
    return s;
}

function parseDateSafe(s){
    if(!s) return new Date(2000,0,1);
    if(typeof s==='number'){
        var d=new Date((s-25569)*86400000);
        return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
    }
    if(typeof s==='string' && s.match(/^\d{4}-\d{2}-\d{2}$/)){
        var p=s.split('-');
        return new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    }
    var d=new Date(s);
    return isNaN(d.getTime())?new Date(2000,0,1):d;
}

function getMonthKey(s){
    var d=parseDateSafe(s);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}

function renderChartsFor(vid){
    var h=vEntries[vid]||[];
    var data=h.filter(function(e){return e.mileage>0;});
    // Destroy old charts
    if(charts['ch1_'+vid]){charts['ch1_'+vid].destroy();}
    if(charts['ch2_'+vid]){charts['ch2_'+vid].destroy();}
    if(charts['ch3_'+vid]){charts['ch3_'+vid].destroy();}
    // Mileage trend
    var el1=document.getElementById('ch1_'+vid);
    if(el1&&data.length>0){
        var unit=getUnit(data[0].fuelType);
        charts['ch1_'+vid]=new Chart(el1.getContext('2d'),{
            type:'line',
            data:{labels:data.map(function(e){return fmtDate(e.date);}),datasets:[{label:'Mileage (km/'+unit+')',data:data.map(function(e){return parseFloat(e.mileage.toFixed(2));}),borderColor:'#667eea',backgroundColor:'rgba(102,126,234,0.1)',borderWidth:2,fill:true,tension:0.3,pointBackgroundColor:'#764ba2',pointRadius:4}]},
            options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false}}}
        });
    }
    // Monthly cost/km
    var el2=document.getElementById('ch2_'+vid);
    if(el2&&data.length>0){
        var monthly={};
        data.forEach(function(e){var k=getMonthKey(e.date);if(!monthly[k])monthly[k]=[];monthly[k].push(e.price/e.mileage);});
        var mKeys=Object.keys(monthly).sort();
        var mVals=mKeys.map(function(m){var v=monthly[m];var s=0;v.forEach(function(x){s+=x;});return parseFloat((s/v.length).toFixed(2));});
        var mLabels=mKeys.map(function(m){var p=m.split('-');return new Date(parseInt(p[0]),parseInt(p[1])-1).toLocaleDateString('en-IN',{month:'short',year:'numeric'});});
        charts['ch2_'+vid]=new Chart(el2.getContext('2d'),{
            type:'line',
            data:{labels:mLabels,datasets:[{label:'₹/km',data:mVals,borderColor:'#f39c12',backgroundColor:'rgba(243,156,18,0.1)',borderWidth:2,fill:true,tension:0.3,pointBackgroundColor:'#e67e22',pointRadius:4}]},
            options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false,title:{display:true,text:'₹/km'}}}}
        });
    }
    // Monthly Distance & Fuel Spend (bar chart with dual y-axis)
    var el3=document.getElementById('ch3_'+vid);
    if(el3&&h.length>0){
        var mDist={},mSpend={};
        h.forEach(function(e){var key=getMonthKey(e.date);if(!mDist[key])mDist[key]=0;if(!mSpend[key])mSpend[key]=0;mDist[key]+=(e.distance||0);mSpend[key]+=(e.totalCost||0);});
        var months=Object.keys(mDist).sort();
        var distVals=months.map(function(m){return mDist[m];});
        var spendVals=months.map(function(m){return parseFloat(mSpend[m].toFixed(0));});
        var mLabels3=months.map(function(m){var p=m.split('-');return new Date(parseInt(p[0]),parseInt(p[1])-1).toLocaleDateString('en-IN',{month:'short',year:'numeric'});});
        charts['ch3_'+vid]=new Chart(el3.getContext('2d'),{
            type:'bar',
            data:{labels:mLabels3,datasets:[
                {label:'Distance (km)',data:distVals,backgroundColor:'rgba(52,152,219,0.7)',borderColor:'#3498db',borderWidth:1,borderRadius:4,yAxisID:'y'},
                {label:'Fuel Spend (₹)',data:spendVals,backgroundColor:'rgba(243,156,18,0.7)',borderColor:'#f39c12',borderWidth:1,borderRadius:4,yAxisID:'y1'}
            ]},
            options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,position:'left',title:{display:true,text:'Distance (km)'}},y1:{beginAtZero:true,position:'right',title:{display:true,text:'Spend (₹)'},grid:{drawOnChartArea:false}}}}
        });
    }
}

// === RANGE STATISTICS BETWEEN TWO HISTORY ENTRIES ===
function showRangeStats(vid){
    var fromEl=document.getElementById('rangeFrom_'+vid);
    var toEl=document.getElementById('rangeTo_'+vid);
    var resultEl=document.getElementById('rangeResult_'+vid);
    if(!fromEl||!toEl||!resultEl) return;
    var fromIdx=parseInt(fromEl.value);
    var toIdx=parseInt(toEl.value);
    if(isNaN(fromIdx)||isNaN(toIdx)){
        resultEl.innerHTML='<div style="color:#e74c3c;font-size:0.85em;padding:10px;background:rgba(231,76,60,0.08);border-radius:8px;border:1px solid rgba(231,76,60,0.3);margin-top:8px;">⚠️ Please select both "From" and "To" entries.</div>';
        return;
    }
    if(fromIdx>toIdx){var tmp=fromIdx;fromIdx=toIdx;toIdx=tmp;}
    if(fromIdx===toIdx){
        resultEl.innerHTML='<div style="color:#f39c12;font-size:0.85em;padding:10px;background:rgba(243,156,18,0.08);border-radius:8px;border:1px solid rgba(243,156,18,0.3);margin-top:8px;">⚠️ Please select two different entries to compare.</div>';
        return;
    }
    var h=vEntries[vid]||[];
    if(fromIdx<0||toIdx>=h.length) return;
    var fromEntry=h[fromIdx];
    var toEntry=h[toIdx];
    // Calculate statistics between the two entries
    var totalDist=toEntry.odometer-fromEntry.odometer;
    var totalFuel=0,totalCost=0,fillUps=0,mileages=[];
    for(var i=fromIdx+1;i<=toIdx;i++){
        totalFuel+=h[i].qty;
        totalCost+=h[i].totalCost;
        fillUps++;
        if(h[i].mileage>0) mileages.push(h[i].mileage);
    }
    var avgMileage=mileages.length>0?(mileages.reduce(function(a,b){return a+b;},0)/mileages.length):0;
    var bestMileage=mileages.length>0?Math.max.apply(null,mileages):0;
    var worstMileage=mileages.length>0?Math.min.apply(null,mileages):0;
    var costPerKm=totalDist>0?(totalCost/totalDist):0;
    var avgPrice=totalFuel>0?(totalCost/totalFuel):0;
    var unit=getUnit(fromEntry.fuelType||'Petrol/Diesel');
    // Date range
    var dateFrom=fmtDate(fromEntry.date);
    var dateTo=fmtDate(toEntry.date);
    var daysDiff=Math.round((parseDateSafe(toEntry.date)-parseDateSafe(fromEntry.date))/(1000*60*60*24));
    var kmPerDay=daysDiff>0?(totalDist/daysDiff):0;
    // Build result HTML
    var r='<div style="margin-top:10px;padding:16px;background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08));border-radius:12px;border:1px solid rgba(102,126,234,0.25);">';
    r+='<div style="font-weight:700;font-size:0.95em;color:#667eea;margin-bottom:12px;">📅 '+dateFrom+' → '+dateTo+' <span style="color:#999;font-weight:400;font-size:0.85em;">('+daysDiff+' days)</span></div>';
    r+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">';
    r+='<div style="background:rgba(52,152,219,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(52,152,219,0.2);"><div style="font-size:1.2em;font-weight:700;color:#2980b9;">'+totalDist.toLocaleString()+' km</div><div style="font-size:0.75em;color:#666;margin-top:4px;">🛣️ Distance</div></div>';
    r+='<div style="background:rgba(39,174,96,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(39,174,96,0.2);"><div style="font-size:1.2em;font-weight:700;color:#27ae60;">'+(avgMileage>0?avgMileage.toFixed(2):'--')+' km/'+unit+'</div><div style="font-size:0.75em;color:#666;margin-top:4px;">📊 Avg Mileage</div></div>';
    r+='<div style="background:rgba(243,156,18,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(243,156,18,0.2);"><div style="font-size:1.2em;font-weight:700;color:#e67e22;">₹'+totalCost.toLocaleString(undefined,{maximumFractionDigits:0})+'</div><div style="font-size:0.75em;color:#666;margin-top:4px;">💰 Total Spent</div></div>';
    r+='<div style="background:rgba(142,68,173,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(142,68,173,0.2);"><div style="font-size:1.2em;font-weight:700;color:#8e44ad;">'+totalFuel.toFixed(1)+' '+unit+'</div><div style="font-size:0.75em;color:#666;margin-top:4px;">⛽ Fuel Used</div></div>';
    r+='<div style="background:rgba(231,76,60,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(231,76,60,0.2);"><div style="font-size:1.2em;font-weight:700;color:#e74c3c;">₹'+costPerKm.toFixed(2)+'/km</div><div style="font-size:0.75em;color:#666;margin-top:4px;">💸 Cost/KM</div></div>';
    r+='<div style="background:rgba(26,188,156,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(26,188,156,0.2);"><div style="font-size:1.2em;font-weight:700;color:#1abc9c;">'+fillUps+'</div><div style="font-size:0.75em;color:#666;margin-top:4px;">🔄 Fill-ups</div></div>';
    r+='<div style="background:rgba(44,62,80,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(44,62,80,0.2);"><div style="font-size:1.2em;font-weight:700;color:#2c3e50;">₹'+avgPrice.toFixed(2)+'/'+unit+'</div><div style="font-size:0.75em;color:#666;margin-top:4px;">🏷️ Avg Fuel Price</div></div>';
    r+='<div style="background:rgba(52,73,94,0.1);padding:12px;border-radius:10px;text-align:center;border:1px solid rgba(52,73,94,0.2);"><div style="font-size:1.2em;font-weight:700;color:#34495e;">'+kmPerDay.toFixed(1)+' km/day</div><div style="font-size:0.75em;color:#666;margin-top:4px;">📏 Daily Average</div></div>';
    r+='</div>';
    // Best & Worst mileage
    if(mileages.length>1){
        r+='<div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">';
        r+='<div style="flex:1;background:rgba(39,174,96,0.12);padding:10px 14px;border-radius:8px;border:1px solid rgba(39,174,96,0.25);text-align:center;"><span style="font-weight:600;color:#27ae60;">🏆 Best: '+bestMileage.toFixed(2)+' km/'+unit+'</span></div>';
        r+='<div style="flex:1;background:rgba(231,76,60,0.12);padding:10px 14px;border-radius:8px;border:1px solid rgba(231,76,60,0.25);text-align:center;"><span style="font-weight:600;color:#e74c3c;">📉 Worst: '+worstMileage.toFixed(2)+' km/'+unit+'</span></div>';
        r+='</div>';
    }
    r+='</div>';
    resultEl.innerHTML=r;
}

function clearRangeStats(vid){
    var resultEl=document.getElementById('rangeResult_'+vid);
    var fromEl=document.getElementById('rangeFrom_'+vid);
    var toEl=document.getElementById('rangeTo_'+vid);
    if(resultEl) resultEl.innerHTML='';
    if(fromEl) fromEl.value='';
    if(toEl) toEl.value='';
}
