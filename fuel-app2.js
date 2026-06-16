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
    // Charts
    s+='<div class="card"><h2>📈 Mileage Trend</h2><div class="chart-box"><canvas id="ch1_'+vid+'"></canvas></div></div>';
    s+='<div class="card"><h2>💰 Cost/KM Monthly</h2><div class="chart-box"><canvas id="ch2_'+vid+'"></canvas></div></div>';
    s+='<div class="card"><h2>🛣️ Monthly Distance & 💸 Fuel Spend</h2><div class="chart-box"><canvas id="ch3_'+vid+'"></canvas></div></div>';
    // Table
    s+='<div class="card"><h2>📋 Fill-up History</h2>';
    if(h.length===0){s+='<p style="color:#999;text-align:center;padding:15px">No entries yet.</p>';}
    else{
        s+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Date</th><th>Fuel</th><th>Odometer</th><th>Distance</th><th>Qty</th><th>Price</th><th>Total ₹</th><th>Mileage</th><th>Action</th></tr></thead><tbody>';
        h.forEach(function(e,i){
            var fu=getUnit(e.fuelType);
            s+='<tr><td>'+(i+1)+'</td><td>'+fmtDate(e.date)+'</td><td>'+(e.fuelType||'P/D')+'</td>';
            s+='<td>'+e.odometer.toLocaleString()+'</td><td>'+(e.distance>0?e.distance+' km':'-')+'</td>';
            s+='<td>'+e.qty.toFixed(1)+' '+fu+'</td><td>₹'+e.price.toFixed(2)+'/'+fu+'</td><td>₹'+e.totalCost.toFixed(0)+'</td>';
            s+='<td>'+(e.mileage>0?e.mileage.toFixed(2)+' km/'+fu:'-')+'</td>';
            s+='<td style="white-space:nowrap"><button class="act-btn act-insert" onclick="insertEntry(\''+vid+'\','+i+')" title="Insert above">+</button><button class="act-btn act-edit" onclick="editEntry(\''+vid+'\','+i+')" title="Edit">✎</button><button class="act-btn act-del" onclick="delEntry(\''+vid+'\','+i+')" title="Delete">✕</button></td></tr>';
        });
        s+='</tbody></table></div>';
    }
    s+='</div>';
    return s;
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
        data.forEach(function(e){var d=new Date(e.date);var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!monthly[k])monthly[k]=[];monthly[k].push(e.price/e.mileage);});
        var mKeys=Object.keys(monthly).sort();
        var mVals=mKeys.map(function(m){var v=monthly[m];var s=0;v.forEach(function(x){s+=x;});return parseFloat((s/v.length).toFixed(2));});
        var mLabels=mKeys.map(function(m){var p=m.split('-');return new Date(p[0],p[1]-1).toLocaleDateString('en-IN',{month:'short',year:'numeric'});});
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
        h.forEach(function(e){var d=new Date(e.date);var key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!mDist[key])mDist[key]=0;if(!mSpend[key])mSpend[key]=0;mDist[key]+=(e.distance||0);mSpend[key]+=(e.totalCost||0);});
        var months=Object.keys(mDist).sort();
        var distVals=months.map(function(m){return mDist[m];});
        var spendVals=months.map(function(m){return parseFloat(mSpend[m].toFixed(0));});
        var mLabels3=months.map(function(m){var p=m.split('-');return new Date(p[0],p[1]-1).toLocaleDateString('en-IN',{month:'short',year:'numeric'});});
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
