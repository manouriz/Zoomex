var timer;
let AMOUNT_RETRY_TIMEOUT = 2500;
function looper(){
	run();
	chrome.runtime.sendMessage({'section': 'status', 'status': 'running'});
	timer = setTimeout(function(){ 
		looper();
	}, AMOUNT_RETRY_TIMEOUT);
}
looper();


function run(){
	//if wc-container-right > participants-header__title
	let par_title = $('div.participants-header__title');
	//console.log("Participants Tab", par_title)
	if(par_title.length <= 0){
		$('div.footer-button__participants-icon').closest('button').trigger("click");
	}else{
		let cur_participants = get_participants();
		//console.log("cur_participants", cur_participants);
		let cur_ts = new Date().getTime();
		if(typeof cur_ts != 'number'){
			cur_ts = Date.now();
		}
		
		// store participants data all_parts_data{name,img} / if new participant is appear, all_parts_data list will update
		chrome.storage.local.get(['all_parts_data'], function(object) {
			let all_parts_data = object.all_parts_data || {};
			//console.log("all_parts_data", all_parts_data);
			Object.keys(cur_participants).forEach(function(id){
				let part = cur_participants[id];
				//console.log("part", part);
				if(!all_parts_data[id]){
					all_parts_data[id] = {
						name: part.name,
						img: part.img
					}
					//console.log("all_parts_data updated");
				}
			});
			chrome.storage.local.set({all_parts_data: all_parts_data});
		});


		update_his('his_presence','is_present');
		update_his('his_cameraoff','is_cameraoff');
		update_his('his_unmuted','is_unmuted');

		function update_his(section,field){
			chrome.storage.local.get(['all_parts_data'], function(obj_all_parts) {
				let all_parts = obj_all_parts['all_parts_data'] || {};
				chrome.storage.local.get([section], function(object) {
					var data = object[section] || {};
					Object.keys(all_parts).forEach(function (id){
						let part = cur_participants[id];
						let arr = data[id];							
						if(part != undefined){
							// if arr is undefined -> this is the first activity of this part. create and push the first item.
							// if prv-status != cur_status:
							// 		set 'f' and 'u' to cur_ts
							// 		add new status to arr
							// else
							// 		set prv.u to cur_ts
							// 		update prv
							if(arr == undefined){
								// data of this part is new
								data[id] = new Array();
								data[id].push({
									s: part[field],
									f: cur_ts,
									u: cur_ts
								});
								arr = data[id];
							}
							let prv_entry = arr[arr.length - 1];
							if(prv_entry.s != part[field]){
								// add new status
								data[id].push({
									s: part[field],
									f: cur_ts,
									u: cur_ts
								});

							}else if(prv_entry.s == part[field]){
								prv_entry.u = cur_ts;
								data[id][arr.length - 1] = prv_entry;
							}

						}else{
							// this part is not exist in the current_parts list. 
							// if prv-status is true, set 'u' to cur_ts, set status to default(false).
							if(arr != undefined){
								let prv_entry = arr[arr.length - 1];
								if(prv_entry.s == true){
									prv_entry.u = cur_ts;
									prv_entry.s = false;
									data[id][arr.length - 1] = prv_entry;
								}
							}
						}
					});
					//console.log("section",section,"field",field,"data",data);
					let sec_data ={};
					sec_data[section] = data;
					chrome.storage.local.set(sec_data);
				});
			});
		}
	}
	
	// remove extra unused elements from page
	// remove_unused_elements();
}

function get_participants(){
	let participants = {};
	$('ul.participants-ul li').each(function(){
		let item = $(this);
		let name = item.find('span.participants-item__display-name').text();
		let id = 'p' + hash(name);
		let label = item.find('span.participants-item__name-label').text();
		let img = item.find('img.participants-item__avatar').attr('src');
		let is_unmuted = item.find('i.participants-icon__participants-mute').length > 0 ? true : item.find('i.participants-icon__participants-mute-animation').length > 0 ? true : false;
		//is_muted   = item.find('i.participants-icon__participants-unmute').length > 0 ? true : false;
		let is_cameraoff = item.find('i.participants-icon__participant-video--stopped').length > 0 ? true : false;
		//is_cameraon  = item.find('i.participants-icon__participant-video--started').length > 0 ? true : false;
		participants[id] = {
			'name': name,
			//'label': label,
			'img': img,
			'is_unmuted': is_unmuted,
			//'is_muted': is_muted,
			'is_cameraoff': is_cameraoff,
			//'is_cameraon': is_cameraon,
			'is_present': true
		};			
	});
	return participants;
}

function remove_unused_elements(){
	$("div.sharing-layout").remove();
	$("div.speaker-view").remove();	
}

var hash = function(s) {
    for(var i = 0, h = 0xdeadbeef; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return (h ^ h >>> 16) >>> 0;
};