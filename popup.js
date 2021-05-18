
var tab_id = null;
chrome.runtime.onMessage.addListener(function(req, sender) {
	//console.log('New Message',req);	
	if(req.section == 'status'){
		if(req.status == 'running'){
			// is active
			tab_id = sender.tab.id;
			//show_datasize();
			//show_stats();
			update_status();
			get_aliens();
			get_status_parts('his_cameraoff','.col-nocamera','nocamera');
			get_status_parts('his_unmuted','.col-unmuted','unmuted');
			fill_parts_images();
		}else{
			// is not active
		}
	}
});

function update_status(){
	let cur_ts = new Date().getTime();
	if(typeof cur_ts != 'number'){
		cur_ts = Date.now();
	}
	chrome.storage.local.get(['his_presence'], function(obj) {
		let data = obj.his_presence || {};
		//console.log("his_presence",data);
		$(".col-parts div.media").attr("class","media absent");
		Object.keys(data).forEach(function(id){
			let part = data[id];		
			let elem = $(".col-parts div[data-id='" + id + "']");
			if(elem.length){
				let joined_ts = cur_ts - part[0].f;
				elem.find(".lbl_joined").text("Joined: " + ms2time(joined_ts));
				let last_activity_ts = cur_ts - part[part.length - 1].u;
				elem.find(".lbl_last_activity").text("Last activity: " + ms2time(last_activity_ts));
				if(last_activity_ts > 5000){
					// user is disconnected
					elem.attr("class","media disconnected");	
				}else{
					// user is online
					elem.attr("class","media online");	
				}
			}
		});
		copy_parts_to_section('.col-absent','.absent');
		copy_parts_to_section('.col-disconnected','.disconnected');
	});
}

// copy group of participant cards into another sections
function copy_parts_to_section(col,cls){
	$(col + ' .media').attr("data4remove","true");
	$(col + ' .items .alert').fadeOut(500).remove();
	let count = 0;
	//$(col + " .items *").remove();
	$(".col-parts div.media" + cls).each(function(){
		let id = $(this).attr("data-id");
		let tmp = $(col + " .media[data-id='" + id + "']");
		if(tmp.length > 0){
			tmp.removeAttr("data4remove");
			let lbl_joined = $(this).find(".lbl_joined").text();
			let lbl_last_activity = $(this).find(".lbl_last_activity").text();
			tmp.find(".lbl_joined").text(lbl_joined);
			tmp.find(".lbl_last_activity").text(lbl_last_activity);
		}else{
			let item = $(this).clone();
			$(col + " .items").prepend(item);
		}
		count++;
	});
	$(col + " .count").text(count);
	$(col + " .media[data4remove='true']").fadeOut("slow", function() {
		$(this).remove();
  	});
}


// get current online participants and highlight participants who there are not listed in "Uploaded Participants list"
function get_aliens(){
	let cur_ts = new Date().getTime();
	if(typeof cur_ts != 'number'){
		cur_ts = Date.now();
	}
	chrome.storage.local.get(['all_parts_data'], function(obj) {
		let all_parts = obj.all_parts_data || {};
		chrome.storage.local.get(['his_presence'], function(obj) {
			let data = obj.his_presence || {};
			let alien_parts = {};
			Object.keys(data).forEach(function (id){
				let part = all_parts[id];
				let presence_data = data[id];
				let elem = $(".col-parts div[data-id='" + id + "']");
				if(!elem.length){
					let joined_ts = "Joined: " + ms2time(cur_ts - presence_data[0].f);
					let last_activity_ts = "Last activity: " + ms2time(cur_ts - presence_data[presence_data.length - 1].u);
					alien_parts[id] = {
						'name': part.name,
						'nickname': part.name, // the nickname is not defined yet
						'joined_ts': joined_ts,
						'last_activity_ts': last_activity_ts
					};
				}
			});
			fill_items(alien_parts,'.col-aliens');
			// add2parts feature implementation -----------
			$(".col-aliens .media").attr("class","media alien");
			$(".col-aliens .media .btn.add").off("click");
			$(".col-aliens .media").hover(
				function () {
					$(this).find(".btn").removeClass("hide");
				},
				function () {
					$(this).find(".btn").addClass("hide");
				}
			);
			$(".col-aliens .media .btn.add").on("click",function(){	
				let btn = $(this).parent().parent();
				let id = btn.data("id");
				let name = btn.data("name");
				let nickname = btn.data("nickname");				
				$("#modal-add2parts").data("id", id).data("name", name).data("nickname", nickname).modal("show");
			});
			// add2parts feature END ----------------------
		});
	});
}


// get current status of specific features(e.g. camera-off, unmuted) as add them to related section
function get_status_parts(storage_variable,col,media_cls){
	let cur_ts = new Date().getTime();
	if(typeof cur_ts != 'number'){
		cur_ts = Date.now();
	}
	chrome.storage.local.get(['all_parts_data'], function(obj) {
		let all_parts = obj.all_parts_data || {};
		chrome.storage.local.get([storage_variable], function(obj) {
			let data = obj[storage_variable] || {};
			let parts = {};
			Object.keys(data).forEach(function (id){
				let part = all_parts[id];
				let sub_data = data[id];
				let last_status = sub_data[sub_data.length - 1];
				if(last_status && last_status.s == true){
					let joined_ts = "Joined: " + ms2time(cur_ts - sub_data[0].f);
					let last_activity_ts = "Duration: " + ms2time(last_status.u - last_status.f);
					parts[id] = {
						'name': part.name,
						'joined_ts': joined_ts,
						'last_activity_ts': last_activity_ts
					}
				}
			});
			fill_items(parts,col);
			$(col + " div.media").attr("class","media " + media_cls);
		});
	});
}


let uploaded_participants_list = {};
let fileHandle;
btnUploadList.addEventListener('click', async () => {
	const pickerOpts = {
		types: [
			{
				description: 'Comma Separated Values',
				accept: {
					'files/*': ['.csv']
				}
			},
		],
		excludeAcceptAllOption: true,
		multiple: false
	};
  [fileHandle] = await window.showOpenFilePicker(pickerOpts);
  const file = await fileHandle.getFile();
  const contents = await file.text();
	if(contents.length > 0){
		$(".col-parts .items *").remove();
		uploaded_participants_list = {};
		contents.split("\n").forEach(function(item){
			let nickname = null;
			let name = null;
			if(item.length > 0 && item.indexOf(",") > 0){
				itemx = item.split(",");
				name = itemx[0].trim();
				nickname = itemx[1].trim();
				id = 'p' + hash(nickname);
				uploaded_participants_list[id] = {
					//'id': id,
					'name': name,
					'nickname': nickname
				};
				//console.log("nickname",nickname,"id",id);
				//add_part_to_list({'id':id,'name':name,'nickname':nickname});
			}
		});
		fill_items(uploaded_participants_list,'.col-parts');
		$(".lbl_parts_file").text(file.name);
		//alert(count + " patricipants imported!");
		fill_parts_images();
		get_aliens();
	}
});


function fill_parts_images(){
	chrome.storage.local.get(['all_parts_data'], function(obj) {
		let all_parts = obj.all_parts_data || {};
		//console.log(all_parts);
		Object.keys(all_parts).forEach(function (id){
			let img = all_parts[id].img;
			$("div[data-id='" + id + "'] img").attr("src",img);
		});
	});
}


function fill_items(arr,cls){
	$(cls + ' .media').attr("data4remove","true");
	$(cls + ' .items .alert').fadeOut(500).remove();
	Object.keys(arr).forEach(function(id){
		let item = arr[id];
		let tmp = $(cls + " .media[data-id='" + id + "']");
		let joined_ts = item.joined_ts ? item.joined_ts : (item.ts ? ms2time(item.ts) : "Not seen yet");
		let last_activity_ts = item.last_activity_ts ? item.last_activity_ts : "";
		if(tmp.length){
			// update ts only
			tmp.removeAttr("data4remove");
			tmp.find(".media-body .lbl_joined").text(joined_ts);
			tmp.find(".media-body .lbl_last_activity").text(last_activity_ts);
		}else{
			// add whole item			
			let nickname = item.nickname ? item.nickname : item.name;
			let html = "" +
			"<div class='media' data-id='" + id  + "' data-name='" + item.name + "' data-nickname='" + nickname + "'>" + 
			"	<div class='media-left'>" +
			"		<img src='#'>" + 
			"	</div>" +
			"	<div class='media-body'>" + 
			"		<div>" + 
			"			<h5>" + item.name + " <span>(" + nickname + ")</span></h5>" + 
			"			<span class='lbl_joined'>" + joined_ts + "</span>" +
			"			<span class='lbl_last_activity'>" + last_activity_ts + "</span>" +
			"		</div>" +
			"	</div>" +
			"	<div class='media-right'>" + 
			"		<button class='btn btn-sm btn-primary add hide' title='Add to Participants'><i class='glyphicon glyphicon-plus'></i> Add to Participants</button>" + 
			"	</div>"
			"</div>";
			$(html).hide().appendTo(cls + " .items").fadeIn();
		}
	});
	$(cls + " .media[data4remove='true']").fadeOut("slow", function() {
		$(this).remove();
  	});
	let count = Object.keys(arr).length;
	$(cls + " .count").text(count);
}


$("#modal-add2parts").on("shown.bs.modal", function(e){
	let new_id = $(this).data("id");
	let name = $(this).data("name");
	let nickname = $(this).data("nickname");
	$("#modal-add2parts .modal-title").html("Adding <strong>" + name + " (" + nickname + ")</strong> to the Participants");
	let html = "<ul class='lst-add2parts'>";
	$(".col-absent .media").each(function(index){
		let par = $(this);
		html += "<li class='btn btn-primary' data-id='" + par.data("id") + "' data-name='" + par.data("name") + "' data-newnickname='" + nickname + "'>" + par.data("name") + " (" + par.data("nickname") + ")</li>";
	});
	$(".col-disconnected .media").each(function(index){
		let par = $(this);
		html += "<li class='btn btn-primary' data-id='" + par.data("id") + "' data-name='" + par.data("name") + "' data-newnickname='" + nickname + "'>" + par.data("name") + " (" + par.data("nickname") + ")</li>";
	});
	html += "</ul>";
	if(html.length <= 50){
		html += "<div class='alert alert-info' role='alert'>There is not any Absent or Disconnected participant found!</div>";
	}
	$(".modal-body").html(html);	
	$("#modal-add2parts .lst-add2parts li").on("click", function(){
		let old_id = $(this).data("id");		
		let old_name = $(this).data("name");		
		let newnickname = $(this).data("newnickname");
		$(".media[data-id='" + old_id + "'], .media[data-id='" + new_id + "']").find(".media-body h5").html(old_name + " <span>(" + newnickname + ")</span>");
		$(".media[data-id='" + old_id + "']").data("id",new_id).data("nickname",newnickname);
		$("#modal-add2parts").modal("toggle");
		$(".col-aliens .media[data-id='" + new_id + "']").remove();
		$(".media[data-id='" + old_id + "']").remove();
		chrome.storage.local.get(['his_presence'], function(obj) {
			let data = obj.his_presence || {};		
			delete data[old_id];
			data[new_id]['name'] = newnickname;
			chrome.storage.local.set({'his_presence': data});	
		});		
		uploaded_participants_list[new_id] = new Object();
		Object.assign(uploaded_participants_list[new_id], uploaded_participants_list[old_id]);	
		delete uploaded_participants_list[old_id];
		uploaded_participants_list[new_id]['nickname'] = newnickname;			
		fill_items(uploaded_participants_list,'.col-parts');
		$(".col-parts .warning.lst-changed").removeClass("hide");
		//get_aliens();
	});
})


function show_alert(message,seconds){
	$(".my-alert span").html(message);
	$(".my-alert").fadeIn("slow", function() {
		setTimeout(function(){
			$(".my-alert").fadeOut("slow");
		},seconds);
	});
}


$(".btn-tool").on("click",function(){	
	let cls = $(this);
	let content = "";
	let top_parent = $(this).parent().parent().parent().parent().parent();
	let title = top_parent.find("h3").text().trim();
	let count = 0;
	top_parent.find('.items .media').each(function(){
		let item = $(this);
		let name = item.attr("data-name");
		let nickname = item.attr("data-nickname") != "undefined" ? item.attr("data-nickname") : "";
		if(cls.hasClass("names-nicknames")){
			content += name + ", " + nickname + "\n";
		}else if(cls.hasClass("nicknames")){
			content +=nickname + "\n";
		}else if(cls.hasClass("names")){
			content += name + "\n";
		}else if(cls.hasClass("save")){
			content += name + ", " + nickname + "\n";
		}
		count +=1 ;
	});
	if(cls.hasClass("save")){
		download(content,"List of " + title + " (" + count + ").csv");

	}else{
		copyToClipboard(content);
		show_alert("The content copied to the clipboard",2000);	
	}
	$(".col-parts .warning.lst-changed").fadeOut(500);
	//$(this).blur();
});


document.getElementById('btnClear').onclick = function() {
	if(confirm("All collected data until now will be cleared.\nContinue?")){
		chrome.storage.local.clear();
		//refresh_all_parts();
	}
}


document.getElementById('btnNewTab').onclick = function() {
	let url = window.location.href;
	chrome.tabs.create({ url: url });
}


document.getElementById('btnDownloadReport').onclick = function() {
	generate_report();
}


function copyToClipboard(text) {
  var $temp = $("<textarea>");
  $("body").append($temp);
  $temp.val(text).select();
  document.execCommand("copy");
  $temp.remove();  
}


function generate_report(){
	let content = "Name, Nickname, Joined Time, Last Activity, Presence\n";
	$(".col-parts .items .media").each(function(index) {
		let part = $(this);
		let id = part.data("id");
		let name = part.data("name");
		let nickname = part.data("nickname") != "undefined" ? part.data("nickname") : "";
		let joined = part.find(".lbl_joined").text().replace("Joined: ","");
		let last_activity = part.find(".lbl_last_activity").text().replace("Last activity: ","");
		let is_presence = $(".col-absent .media[id='" + id + "']").length > 0 ? false : true;
		content += name + "," + nickname + "," + joined + "," + last_activity + "," + is_presence + "\n"; 
	});
	download(content,"Report.csv");
}


function get_now_string(){
	var currentdate = new Date(); 
	return currentdate.getFullYear() + ""
				+ (currentdate.getMonth()+1)  + "" 
				+ currentdate.getDate() + "-"  
				+ currentdate.getHours() + ""  
				+ currentdate.getMinutes() + "" 
				+ currentdate.getSeconds();
}


function download(content,filename){
	uri = "data:text/csv;charset=utf-8," + encodeURIComponent(content);
	var link = document.createElement('a');
	link.setAttribute('href', uri);
	link.setAttribute('download', filename);
	link.click();
}


var hash = function(s) {
    for(var i = 0, h = 0xdeadbeef; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return (h ^ h >>> 16) >>> 0;
};


function ms2time(millisec) {
		var seconds = Math.floor(millisec / 1000);
		var minutes = Math.floor(millisec / (1000 * 60));
		var hours = Math.floor(millisec / (1000 * 60 * 60));
		var days = Math.floor(millisec / (1000 * 60 * 60 * 24));
		if (seconds < 60) {
				return "00:00:" + leftFillNum(seconds,2);
		} else if (minutes < 60) {
				var rest_seconds = (seconds % 60)
				return "00:" + leftFillNum(minutes,2) + ":" + leftFillNum(rest_seconds,2);
		} else if (hours < 24) {
				var rest_seconds = (seconds % 60)
				var rest_minutes = (minutes % 60)				
				return leftFillNum(hours,2) + ":" + leftFillNum(rest_minutes,2) + ":" + leftFillNum(rest_seconds,2);
		} else {
				var rest_seconds = (seconds % 60)
				var rest_minutes = (minutes % 60)				
				var rest_hours = (hours % 24)				
				return days + " Days, " + leftFillNum(rest_hours,2) + ":" + leftFillNum(rest_minutes,2) + ":" + leftFillNum(rest_seconds,2);
		}
}
function leftFillNum(num, targetLength) {
    return num.toString().padStart(targetLength, 0);
}