// ==UserScript==
// @name         Steam 家庭库已有游戏标记（增强版）
// @namespace    https://github.com/sishuphus
// @version      1.33
// @description  在Steam游戏页面标记家庭库已有游戏，增强版新增：成员卡片展示、独占/共同贡献分析、贡献类型饼图、月度购入趋势图、成员详情查看。基于 Cliencer Goge 原版修改。
// @author       sishuphus
// @contributor  Cliencer Goge
// @match        https://store.steampowered.com/*
// @match        https://keylol.com/*
// @match        https://steamdb.keylol.com/tooltip*
// @icon         https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @license      GPLv3
// @contributionURL https://greasyfork.org/zh-CN/scripts/491817
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.js
// ==/UserScript==

var dialog,appid,observer
var isNewUser = false
var isupdate = false
var saves
readstorage()
//console.log(saves)
const url = window.location.host + window.location.pathname;
var access_token,steamid
if(window.location.host == "store.steampowered.com" && g_AccountID != 0){
    access_token = JSON.parse(application_config.getAttribute("data-store_user_config")).webapi_token
    steamid = JSON.parse(application_config.getAttribute("data-userinfo")).steamid
    if(saves.steamid ==""){
        saves.steamid = steamid
    }
    if(saves.steamid != steamid){
        console.log(saves.noPrompt)
        if (saves.noPrompt == null || saves.noPrompt == false){
            ShowConfirmDialog('脚本提示','当前页面登录的账号与缓存账号不对应，脚本可能会出现一些未知的错误，是否需要重新扫描？','扫描家庭库','取消').done(()=>{scan(true)}).fail(()=>{
                ShowAlertDialog('脚本提示','如果需要手动扫描，可以在Steam主页右上角进入进行扫描','好的')
                saves.noPrompt = true
                savestorage()
            })
        }
    }
}

(function() {
    'use strict';
    if(window.location.host == "keylol.com") {
        keyloladHover()

        observer = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            keyloladHover(node)

                        }
                    })
                }
            })
        })
        observer.observe(document, {childList: true, subtree: true});

    }
    if(url.startsWith("steamdb.keylol.com/tooltip")){
        let id = Number(document.baseURI.split('#')[1].split("/")[1])

        if (saves.familyGameList.GameList.includes(id) && !saves.familyGameList.GameInfo[id].owners.includes(saves.steamid)) {
            (function wait_block(){
                let block = document.querySelector('div#game_score')
                if(block){

                    let plugging = document.createElement('div');
                    let innerHTML = `由 ${saves.familyGameList.GameInfo[id].owners.length} 位成员共享（`
                                            saves.familyGameList.GameInfo[id].owners.forEach((steamid)=>{
                                                innerHTML+= `【${saves.familyInfo.steamIdtoName[steamid]}】`
                                            })
                    innerHTML+= `）。最早由【${saves.familyInfo.steamIdtoName[saves.familyGameList.GameInfo[id].owners[0]]}】于 ${timestampToTime(saves.familyGameList.GameInfo[id].time)} 购入。`

                                            plugging.innerHTML = `<b>家庭组: </b>${innerHTML}`
                block.parentNode.insertBefore(plugging, block.nextSibling);

                }else{
                    setTimeout(wait_block,100)
                }
            })();

        }




    }


    function keyloladHover(mutationnode) {
        //getOwnAndWish();
        //block_header_image block_header_gallery load hover
        let node = document
        if(mutationnode) { node = mutationnode}
        node.querySelectorAll('a').forEach(function (link) {
            var href = String(link.getAttribute('href'));
            var match;
            if (match = href.match(/\/(store\.steampowered|steamcommunity)\.com\/(app|sub)\/(\d+)/)) {
                var type = match[2];
                var id = parseInt(match[3]);
                if (type === 'app') {
                    if (saves.familyGameList.GameList.includes(id) && !link.classList.contains('steam-info-familyown')) {
                        if(!saves.familyGameList.GameInfo[id].owners.includes(saves.steamid)){
                            link.classList.add('steam-info-familyown');
                            link.style.fontWeight = "bolder"
                            link.style.color = "#ffffff"
                            link.style.background = "#06cfbe"
                        }
                    }
                } else if (type === 'sub') {
                    //家庭库存不支持sub
                    //if (sub.indexOf(id) !== -1) {
                    //link.addClass('steam-info-own');
                    //}
                }
            }
            /*
            if (link.data('steam-info-hover-added'))
                return;
            link.data('steam-info-hover-added', true);
            if (!parseLink(href))
                return;
            if (link.parent().is('[class*=stcn_a_]'))
                return;
            link.addClass('steam-info-link');
            link.hover(function () {
                addInfo(this);
                if (!link.hasClass('steam-info-loaded'))
                    preload(preloadAmount, link);
                link.addClass('steam-info-loaded');
            });
            */
        });
        //setTimeout(keyloladHover, 1000);
    }










    if(window.location.host != "store.steampowered.com") {return ;}


    init()
    if(g_AccountID == 0){return;}



    if(!isNewUser && saves.settings.isAutoScan && g_ServerTime-saves.lastupDateTime>86400){
        scan(false)
    }else if(!isupdate && g_ServerTime-saves.lastupDateTime>604800){
        let innerText
        if (saves.noPrompt == null || saves.noPrompt == false){
            if(saves.familyGameList.GameList.length == 0){
                innerText="您似乎没有家庭库的游戏记录，是否现在扫描家庭库游戏并记录呢？"
            }else{
                innerText="您已经超过1周没有更新家庭库的游戏列表了，是否现在去扫描?"
            }
            ShowConfirmDialog('脚本提示',innerText,'扫描家庭库','取消').done(()=>{scan(true)}).fail(()=>{
                saves.settings.isAutoScan = false
                saves.noPrompt = true
                savestorage()
                ShowAlertDialog('脚本提示','如果需要手动扫描，可以在Steam主页右上角进入进行扫描','好的')
            })
        }
    }

    var search_suggestion = document.getElementById('search_suggestion_contents')
    if(search_suggestion){
        var observer_search = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {

                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查新节点是否有指定的类
                            if (node.classList.contains('match_app')) {
                                addflag(node)
                            }
                        }
                    });
                }
            })
        });
        observer_search.observe(search_suggestion, {childList: true, subtree: true});
    }



    if(url == "store.steampowered.com/" ){
        observer_3()
        observer = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if(node.classList.contains('live_streams_ctn')){return;}

                            node.querySelectorAll("div").forEach((node)=>{
                                addflag(node)
                            })
                            node.querySelectorAll("a").forEach((node)=>{
                                if(node.classList.contains('screenshot')){return;}
                                if(node.querySelector('div.broadcast_live_stream_icon')){return;}
                                addflag(node)
                            })

                        }
                    })
                }
            })
        })
        observer.observe(document, {childList: true, subtree: true});

    }
    if(url.startsWith('store.steampowered.com/app/')&&g_AccountID != 0){
        //addBanner(document.querySelector('div.block.game_media_and_summary_ctn'))
        observer_2();
    }
    if(url.startsWith('store.steampowered.com/search/')&&g_AccountID != 0){
        observer_4()
        var search_results = document.getElementById('search_results')
        observer = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {

                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList.contains('search_result_row') && node.classList.contains('ds_collapse_flag') && !node.classList.contains('ds_owned')) {
                                addflag(node,"clear: left;")
                            }else{
                                let lists = node.querySelectorAll("a.search_result_row.ds_collapse_flag")
                                lists.forEach(function(bar){
                                    addflag(bar,"clear: left;")
                                })
                            }
                        }
                    });
                }
            })
        });

        observer.observe(search_results, {childList: true, subtree: true});


    }
    if(url.startsWith('store.steampowered.com/wishlist/')&&g_AccountID != 0){
        observer_6()
        var wishlist_results = document.getElementById('wishlist_ctn')
        let observer_wishlist = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {

                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList.contains('wishlist_row')) {
                                addflag(node)
                            }
                        }
                    });
                }
            })
        });
        observer_wishlist.observe(wishlist_results, {childList: true, subtree: true});
    }

    if(url.startsWith('store.steampowered.com/category/')&&g_AccountID != 0){
        let lists = document.body.querySelectorAll("div.ImpressionTrackedElement")
            lists.forEach(function(bar){
                addflag(bar.querySelector('a'))
            })

        let observer_sale_item = new MutationObserver((mutations, obs) => {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        // 确保是元素节点
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector('div.ImpressionTrackedElement')) {
                                node.querySelectorAll('div.ImpressionTrackedElement').forEach(node=>{
                                    addflag(node.querySelector('a'))
                                })
                            }else if( node.classList.contains('Panel')&&node.classList.contains('Focusable')){
                                    let node_a = node.querySelector('a')
                                    if(node_a){
                                        addflag(node_a)
                                    }
                            }else if( node.querySelector('div.Panel.Focusable')){
                                    let node_a = node.querySelector('div.Panel.Focusable').querySelector('a')
                                    if(node_a){
                                        addflag(node_a)
                                    }
                            }

                        }
                    });
                }
            })
        });
        observer_sale_item.observe(document.body, {childList: true, subtree: true});
    }

    function init(){

        let setting_btn = document.createElement('a');
        setting_btn.className = "Focusable"
        setting_btn.id = "setting_btn"
        setting_btn.style = "font-size:13px;font-weight:400;flex-direction:row; display:flex;align-items:center;cursor:pointer;gap:5px;padding: 0 10px;"
        setting_btn.innerHTML = `<span style="display:flex; width:16px;margin-top:3px"><svg viewBox="0 0 24 24" fill="none"><path d="M7.81998 15.3333C6.2349 16.4298 5.14521 18.1062 4.78665 20H1.33331V15.3333C1.33331 14.0956 1.82498 12.9086 2.70015 12.0335C3.57532 11.1583 4.7623 10.6666 5.99998 10.6666C6.27492 10.6673 6.54929 10.6918 6.81998 10.74C6.71508 11.163 6.66357 11.5975 6.66665 12.0333C6.66944 13.2316 7.07572 14.3941 7.81998 15.3333ZM5.99998 8.69995C6.59332 8.69995 7.17334 8.52401 7.66669 8.19436C8.16004 7.86472 8.54456 7.39618 8.77162 6.848C8.99868 6.29982 9.05809 5.69662 8.94234 5.11468C8.82658 4.53274 8.54086 3.99819 8.1213 3.57863C7.70174 3.15907 7.16719 2.87335 6.58525 2.7576C6.00331 2.64184 5.40011 2.70125 4.85193 2.92831C4.30375 3.15538 3.83522 3.53989 3.50557 4.03324C3.17593 4.52659 2.99998 5.10661 2.99998 5.69995C2.9991 6.09416 3.0761 6.48467 3.22655 6.84904C3.377 7.21342 3.59795 7.54448 3.8767 7.82323C4.15545 8.10198 4.48652 8.32293 4.85089 8.47338C5.21526 8.62383 5.60577 8.70083 5.99998 8.69995ZM18 8.69995C18.5933 8.69995 19.1733 8.52401 19.6667 8.19436C20.16 7.86472 20.5446 7.39618 20.7716 6.848C20.9987 6.29982 21.0581 5.69662 20.9423 5.11468C20.8266 4.53274 20.5409 3.99819 20.1213 3.57863C19.7017 3.15907 19.1672 2.87335 18.5853 2.7576C18.0033 2.64184 17.4001 2.70125 16.8519 2.92831C16.3038 3.15538 15.8352 3.53989 15.5056 4.03324C15.1759 4.52659 15 5.10661 15 5.69995C14.9991 6.09416 15.0761 6.48467 15.2266 6.84904C15.377 7.21342 15.5979 7.54448 15.8767 7.82323C16.1554 8.10198 16.4865 8.32293 16.8509 8.47338C17.2153 8.62383 17.6058 8.70083 18 8.69995ZM21.3333 12.0666C20.896 11.6293 20.3761 11.2833 19.8038 11.0487C19.2316 10.814 18.6184 10.6955 18 10.7C17.725 10.7006 17.4507 10.7251 17.18 10.7733C17.2822 11.1855 17.3336 11.6086 17.3333 12.0333C17.338 13.243 16.9313 14.4185 16.18 15.3666C17.7651 16.4631 18.8547 18.1396 19.2133 20.0333H22.6666V15.3666C22.6756 14.1337 22.1963 12.9473 21.3333 12.0666Z" fill="currentColor"></path><path d="M12 14.7C12.5274 14.7 13.043 14.5436 13.4815 14.2506C13.92 13.9576 14.2618 13.5411 14.4637 13.0539C14.6655 12.5666 14.7183 12.0304 14.6154 11.5131C14.5125 10.9958 14.2585 10.5207 13.8856 10.1477C13.5127 9.77481 13.0375 9.52083 12.5202 9.41794C12.0029 9.31505 11.4668 9.36785 10.9795 9.56969C10.4922 9.77152 10.0757 10.1133 9.78273 10.5518C9.48971 10.9904 9.33331 11.5059 9.33331 12.0334C9.33331 12.7406 9.61426 13.4189 10.1144 13.919C10.6145 14.4191 11.2927 14.7 12 14.7ZM12 16.7C10.7623 16.7 9.57532 17.1917 8.70015 18.0669C7.82498 18.942 7.33331 20.129 7.33331 21.3667H16.6666C16.6666 20.129 16.175 18.942 15.2998 18.0669C14.4246 17.1917 13.2377 16.7 12 16.7Z" fill="currentColor"></path></svg>
        </span>我的家庭库<span style="color: #dcdedf;font-size: 10px;">${saves.familyGameList.GameList.length}</span>`
        setting_btn.onclick = btnonclick
        plug();





        function plug(){
            let headding = document.querySelector('div[aria-label="商店菜单"]')
            if(headding){
                headding.insertBefore(setting_btn, headding.lastChild);
            }else{
                setTimeout(plug,200)
            }
        }
        function btnonclick(){
            let temp_isAutoScan = saves.settings.isAutoScan

            // 构建成员头像列表HTML
            let memberListHTML = '<div id="family_member_list" style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;">'
            saves.familyInfo.family_member.forEach((member) => {
                let memberGameCount = 0
                for (let key in saves.familyGameList.GameInfo) {
                    if (saves.familyGameList.GameInfo[key].owners.includes(member.steamid)) {
                        memberGameCount++
                    }
                }
                let avatarHash = member.avatar || (saves.avatarMap && saves.avatarMap[member.steamid]) || 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb'
                memberListHTML += `<div class="family_member_card" data-steamid="${member.steamid}" style="
                    display:flex;flex-direction:column;align-items:center;cursor:pointer;
                    padding:8px 12px;border-radius:6px;border:2px solid #3a3a3a;
                    background:rgba(255,255,255,0.05);transition:all 0.2s;min-width:80px;">
                    <img src="https://avatars.steamstatic.com/${avatarHash}_medium.jpg"
                         style="width:36px;height:36px;border-radius:50%;margin-bottom:4px;"
                         onerror="this.src='https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg'">
                    <span style="font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;" title="${member.userName}">${member.userName}</span>
                    <span style="font-size:10px;color:#8bc;">${memberGameCount} 款</span>
                </div>`
            })
            memberListHTML += '</div>'
            memberListHTML += '<div style="font-size:11px;color:#898989;margin-bottom:8px;">点击成员查看详细贡献记录 | 点击图表柱子也可查看</div>'

            let innerHTML = `<div id="family_tool_options">
                 <div style="margin-bottom:6px;">目前你的家庭【${saves.familyInfo.family_name}】一共记录了 ${saves.familyGameList.GameList.length} 个共享游戏。<div class="btn_green_steamui btn_small" id="btn_see_game"><span>查看最近购买的游戏</span></div></div>
                 ${memberListHTML}
                 <div style="margin-bottom:6px;"><canvas id="Family_countChart" width="586" height="293" style="display: block; box-sizing: border-box; height: 293px; width: 586px;"></canvas></div>
                 <div style="margin-bottom:6px;">上次扫描时间： ${timestampToTime(saves.lastupDateTime)}</div>
                 <div style="margin-bottom:6px;">
                     <input class="price_option_input" style="background-color: black;color: white;border: transparent;" type="checkbox" id="isAutoScan" ${temp_isAutoScan ? 'checked=""':''}>
                     &nbsp;&nbsp;每隔24小时自动后台扫描并缓存&nbsp;
                     <div class="btn_green_steamui btn_small" id="btn_scan_now"><span>现在扫描家庭库</span></div>
                 </div>


            </div>
            `
            let setting_block = ShowConfirmDialog(`脚本设置`,innerHTML,'保存设置','取消','清空库记录').done(function(arg){
                if(arg == 'SECONDARY'){
                    ShowConfirmDialog('再次确认','你即将清空当前保存的家庭库列表，该行为无法撤销！','好的','算了').done(() =>{
                        savestorage(true)

                        ShowAlertDialog('完成','已经清除所有的缓存','好的')
                    })
                }else{
                    saves.settings.isAutoScan = temp_isAutoScan
                    savestorage()
                }
            })
            observer_5()
            function showFamilyGames(){
                let innerHTML = `
<div style="width: 800px; height: 400px; overflow: auto; padding: 10px;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: #f9f9f9;">
        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">游戏名称</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">购入时间</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">购买者</th>
      </tr>
    </thead>
    <tbody>`

                saves.familyGameList.GameList.forEach(appid=>{
                    innerHTML+=`<tr ${saves.lastupDateTime - saves.familyGameList.GameInfo[appid].time < 2592000 && saves.familyGameList.GameInfo[appid].owners.length == 1 ? 'style="background:green"':""}>
        <td style="border: 1px solid #ddd; padding: 8px;"><a href="https://store.steampowered.com/app/${appid}" target="_blank">${saves.familyGameList.GameInfo[appid].name}</a></td>
        <td style="border: 1px solid #ddd; padding: 8px;">${timestampToTime(saves.familyGameList.GameInfo[appid].time)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${saves.familyInfo.steamIdtoName[saves.familyGameList.GameInfo[appid].owners.at(-1)]}</td>
      </tr>`

                })

                //<div class="apphub_AppIcon"><img src="https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${saves.familyGameList.GameInfo[appid].icon_hash}.jpg"></div>
                innerHTML+=`</tbody></table></div>`
                ShowAlertDialog(`家庭库游戏购买动态`,innerHTML,'关闭',{strSubTitle:"绿色填充行代表家庭库中仅有一人购买，可以视为最新增加游戏（仅统计一个月内）。"})
            }
            function showMemberDetail(targetSteamid){
                let memberName = saves.familyInfo.steamIdtoName[targetSteamid]
                // 收集该成员贡献的游戏
                let exclusiveGames = []  // 独占贡献（仅此一人拥有）
                let sharedGames = []     // 共同贡献（多人拥有）
                for (let key in saves.familyGameList.GameInfo) {
                    let game = saves.familyGameList.GameInfo[key]
                    if (game.owners.includes(targetSteamid)) {
                        if (game.owners.length === 1) {
                            exclusiveGames.push({ appid: key, name: game.name, time: game.time, owners: game.owners })
                        } else {
                            sharedGames.push({ appid: key, name: game.name, time: game.time, owners: game.owners })
                        }
                    }
                }
                // 按时间排序（最新优先）
                exclusiveGames.sort((a, b) => b.time - a.time)
                sharedGames.sort((a, b) => b.time - a.time)

                let totalGames = exclusiveGames.length + sharedGames.length

                // 构建统计概览
                let detailHTML = `
<div style="width: 850px; max-height: 70vh; overflow: auto; padding: 10px;">
  <div style="margin-bottom:12px;padding:12px;background:rgba(6,207,190,0.1);border-radius:8px;border:1px solid rgba(6,207,190,0.3);">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <img src="https://avatars.steamstatic.com/${saves.avatarMap?.[targetSteamid] || saves.familyInfo.family_member.find(m=>m.steamid===targetSteamid)?.avatar || 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb'}_medium.jpg"
           style="width:48px;height:48px;border-radius:50%;">
      <div>
        <div style="font-size:16px;font-weight:bold;color:#06cfbe;">${memberName}</div>
        <div style="font-size:12px;color:#898989;">SteamID: ${targetSteamid}</div>
      </div>
    </div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div style="text-align:center;"><div style="font-size:22px;font-weight:bold;color:#fff;">${totalGames}</div><div style="font-size:11px;color:#898989;">贡献游戏总数</div></div>
      <div style="text-align:center;"><div style="font-size:22px;font-weight:bold;color:#06cfbe;">${exclusiveGames.length}</div><div style="font-size:11px;color:#898989;">独占贡献</div></div>
      <div style="text-align:center;"><div style="font-size:22px;font-weight:bold;color:#ffa500;">${sharedGames.length}</div><div style="font-size:11px;color:#898989;">共同贡献</div></div>
      <div style="text-align:center;"><div style="font-size:22px;font-weight:bold;color:#fff;">${totalGames > 0 ? (exclusiveGames.length / totalGames * 100).toFixed(1) : 0}%</div><div style="font-size:11px;color:#898989;">独占率</div></div>
    </div>
  </div>

  <!-- 饼图: 独占 vs 共同 -->
  <div style="margin-bottom:12px;max-width:260px;">
    <canvas id="Member_PieChart" width="260" height="130"></canvas>
  </div>

  <!-- 月度购入趋势 -->
  <div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:12px;color:#898989;">时间范围：</span>
      <select id="Member_TrendRange" style="background:#1a1a2e;color:#ccc;border:1px solid #3a3a3a;border-radius:4px;padding:2px 8px;font-size:12px;">
        <option value="12">最近12个月</option>
        <option value="24" selected>最近24个月</option>
        <option value="36">最近36个月</option>
        <option value="60">最近5年</option>
        <option value="0">全部</option>
      </select>
    </div>
    <canvas id="Member_TrendChart" width="800" height="220"></canvas>
  </div>

  <!-- 独占贡献游戏列表 -->
  <div style="margin-bottom:10px;">
    <div style="font-size:14px;font-weight:bold;color:#06cfbe;margin-bottom:6px;">独占贡献游戏（${exclusiveGames.length}款）</div>
    ${exclusiveGames.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background-color:#1a1a2e;">
        <th style="border:1px solid #333;padding:6px;text-align:left;">游戏名称</th>
        <th style="border:1px solid #333;padding:6px;text-align:center;width:150px;">购入时间</th>
      </tr></thead>
      <tbody>
        ${exclusiveGames.map(g => `<tr style="background:rgba(6,207,190,0.05);"><td style="border:1px solid #333;padding:6px;"><a href="https://store.steampowered.com/app/${g.appid}" target="_blank" style="color:#66c0f4;">${g.name}</a></td><td style="border:1px solid #333;padding:6px;text-align:center;">${timestampToTime(g.time)}</td></tr>`).join('')}
      </tbody>
    </table>` : '<div style="color:#666;font-size:12px;padding:6px;">暂无独占贡献游戏</div>'}
  </div>

  <!-- 共同贡献游戏列表 -->
  <div style="margin-bottom:10px;">
    <div style="font-size:14px;font-weight:bold;color:#ffa500;margin-bottom:6px;">共同贡献游戏（${sharedGames.length}款）</div>
    ${sharedGames.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background-color:#1a1a2e;">
        <th style="border:1px solid #333;padding:6px;text-align:left;">游戏名称</th>
        <th style="border:1px solid #333;padding:6px;text-align:center;width:150px;">购入时间</th>
        <th style="border:1px solid #333;padding:6px;text-align:center;width:120px;">其他拥有者</th>
      </tr></thead>
      <tbody>
        ${sharedGames.map(g => {
                            let otherOwners = g.owners.filter(id => id !== targetSteamid).map(id => saves.familyInfo.steamIdtoName[id]).join(', ')
                            return `<tr style="background:rgba(255,165,0,0.05);"><td style="border:1px solid #333;padding:6px;"><a href="https://store.steampowered.com/app/${g.appid}" target="_blank" style="color:#66c0f4;">${g.name}</a></td><td style="border:1px solid #333;padding:6px;text-align:center;">${timestampToTime(g.time)}</td><td style="border:1px solid #333;padding:6px;text-align:center;font-size:11px;">${otherOwners}</td></tr>`
                        }).join('')}
      </tbody>
    </table>` : '<div style="color:#666;font-size:12px;padding:6px;">暂无共同贡献游戏</div>'}
  </div>
</div>`

                ShowAlertDialog(`${memberName} 的家庭库贡献详情`, detailHTML, '关闭')

                // 延迟渲染图表，等待DOM就绪
                setTimeout(() => {
                    // 饼图
                    let pieCtx = document.getElementById('Member_PieChart')
                    if (pieCtx) {
                        new Chart(pieCtx, {
                            type: 'doughnut',
                            data: {
                                labels: ['独占贡献', '共同贡献'],
                                datasets: [{
                                    data: [exclusiveGames.length, sharedGames.length],
                                    backgroundColor: ['rgba(6,207,190,0.7)', 'rgba(255,165,0,0.7)'],
                                    borderColor: ['#06cfbe', '#ffa500'],
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                plugins: {
                                    title: { display: true, text: '贡献类型分布', color: '#ccc', font: { size: 12 } },
                                    legend: { labels: { color: '#ccc', font: { size: 11 } } }
                                },
                                responsive: false,
                                maintainAspectRatio: true
                            }
                        })
                    }
                    // 月度趋势图
                    let trendCtx = document.getElementById('Member_TrendChart')
                    let trendRangeSelect = document.getElementById('Member_TrendRange')
                    if (trendCtx && trendRangeSelect) {
                        // 分别计算独占和共同的月度数据
                        function calcMonthlyData(games) {
                            let data = {}
                            games.filter(g => g.time > 0).forEach(g => {
                                let d = new Date(g.time * 1000)
                                let key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                                data[key] = (data[key] || 0) + 1
                            })
                            return data
                        }
                        let exclusiveMonthly = calcMonthlyData(exclusiveGames)
                        let sharedMonthly = calcMonthlyData(sharedGames)
                        // 合并所有月份键
                        let allMonthKeys = new Set([...Object.keys(exclusiveMonthly), ...Object.keys(sharedMonthly)])
                        let allSorted = [...allMonthKeys].sort()

                        function renderTrendChart(months) {
                            let rangeVal = parseInt(months)
                            let sliced = rangeVal === 0 ? allSorted : allSorted.slice(-rangeVal)
                            // 补零
                            let exclusiveLine = sliced.map(m => exclusiveMonthly[m] || 0)
                            let sharedLine = sliced.map(m => sharedMonthly[m] || 0)

                            // 销毁旧图表
                            let existingChart = Chart.getChart(trendCtx)
                            if (existingChart) existingChart.destroy()

                            new Chart(trendCtx, {
                                type: 'line',
                                data: {
                                    labels: sliced,
                                    datasets: [
                                        {
                                            label: '独占贡献',
                                            data: exclusiveLine,
                                            borderColor: '#06cfbe',
                                            backgroundColor: 'rgba(6,207,190,0.15)',
                                            fill: true,
                                            tension: 0.3,
                                            pointRadius: 3,
                                            pointBackgroundColor: '#06cfbe'
                                        },
                                        {
                                            label: '共同贡献',
                                            data: sharedLine,
                                            borderColor: '#ffa500',
                                            backgroundColor: 'rgba(255,165,0,0.15)',
                                            fill: true,
                                            tension: 0.3,
                                            pointRadius: 3,
                                            pointBackgroundColor: '#ffa500'
                                        }
                                    ]
                                },
                                options: {
                                    plugins: {
                                        title: { display: true, text: `月度购入趋势（${rangeVal === 0 ? '全部' : '最近'+rangeVal+'个月'}）`, color: '#ccc', font: { size: 12 } },
                                        legend: { labels: { color: '#ccc', font: { size: 11 } } }
                                    },
                                    scales: {
                                        x: { ticks: { color: '#898989', maxRotation: 45, font: { size: 10 } }, grid: { color: '#2a2a2a' } },
                                        y: { beginAtZero: true, ticks: { color: '#898989', stepSize: 1, font: { size: 10 } }, grid: { color: '#2a2a2a' } }
                                    },
                                    responsive: true
                                }
                            })
                        }
                        // 初始渲染
                        renderTrendChart(trendRangeSelect.value)
                        // 切换时间范围
                        trendRangeSelect.addEventListener('change', function() {
                            renderTrendChart(this.value)
                        })
                    }
                }, 300)
            }
            function observer_5(){
                let ctx = document.getElementById('Family_countChart')
                if(ctx){
                    isAutoScan.addEventListener('change', function(event) {
                        temp_isAutoScan = event.target.checked
                    });


                    btn_scan_now.addEventListener('click',()=>{
                        scan(true)
                        setting_block.Dismiss()
                    })
                    btn_see_game.addEventListener('click',()=>{
                        //添加查看游戏的逻辑
                        showFamilyGames()
                        setting_block.Dismiss()
                    })

                    // ===== 新增：成员卡片点击事件 =====
                    document.querySelectorAll('.family_member_card').forEach(card => {
                        card.addEventListener('mouseenter', function() {
                            this.style.borderColor = '#06cfbe'
                            this.style.background = 'rgba(6,207,190,0.15)'
                        })
                        card.addEventListener('mouseleave', function() {
                            this.style.borderColor = '#3a3a3a'
                            this.style.background = 'rgba(255,255,255,0.05)'
                        })
                        card.addEventListener('click', function() {
                            let sid = this.getAttribute('data-steamid')
                            showMemberDetail(sid)
                        })
                    })



                    let colors = ["#FF000080","#FF7F0080","#FFFF0080","#00FF0080","#00FFFF80","#0000FF80","#8B00FF80"]//七彩色
                    let labels = []
                    let datasets = []
                    let membermap = {}//id反查表
                    //生成名字的标签和初始化数据结构及id反查表

                    let i = 0
                    saves.familyInfo.family_member.forEach((member)=>{
                        labels.push(member.userName)
                        membermap[member.steamid] = i
                        datasets.push({
                            label:`${saves.familyInfo.family_member.length - i}人共同贡献`,
                            data: [],
                            borderWidth: 3,
                            backgroundColor: colors[saves.familyInfo.family_member.length - i - 1],
                        })
                        saves.familyInfo.family_member.forEach((member)=>{
                            datasets[i].data.push(0)
                        })
                        if(i == saves.familyInfo.family_member.length - 1){
                            datasets[i].label = "单独贡献"
                        }
                        i++
                    })




                    //生成数据
                    for (let key in saves.familyGameList.GameInfo){
                        let game = saves.familyGameList.GameInfo[key]
                        game.owners.forEach((owner)=>{
                            datasets[labels.length-game.owners.length].data[membermap[owner]] += 1
                        })
                    }

                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: datasets
                        },
                        options: {
                            onClick: function(event, elements) {
                                if (elements.length > 0) {
                                    let index = elements[0].index
                                    let clickedSteamid = saves.familyInfo.family_member[index].steamid
                                    showMemberDetail(clickedSteamid)
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: true,
                                    text: '家庭库贡献表（仅统计数量）'
                                },
                            },
                            responsive: true,
                            scales: {
                                x: {
                                    stacked: true,
                                },
                                y: {
                                    beginAtZero: true,
                                    stacked: true
                                }
                            }
                        }
                    });


                }else{
                    setTimeout(observer_5,200)
                }
            }
        }
    }
    function observer_6(){
        let block = document.getElementById('wishlist_ctn')
        if(block){
            let lists = block.querySelectorAll("div.wishlist_row")
            lists.forEach(function(bar){
                addflag(bar)
            })
        }else{
            setTimeout(observer_6,200)
        }

    }

    function observer_4(){
        let block = document.getElementById('search_result_container')
        if(block){
            let lists = block.querySelectorAll("a.search_result_row.ds_collapse_flag")
            lists.forEach(function(bar){
                addflag(bar,"clear: left;")
            })

        }else{
            setTimeout(observer_4,200)
        }

    }
    function observer_3(){
        let block = document.querySelector('div.home_tabs_content')
        if(block){
            let lists = block.querySelectorAll("a.tab_item")
            lists.forEach(function(bar){
                addflag(bar,"clear: both;")
            })

            block = document.querySelector('div.carousel_container.maincap')
            lists = block.querySelectorAll("a.store_main_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })

            block = document.querySelector('div.carousel_container.spotlight')
            lists = block.querySelectorAll("div.home_area_spotlight")
            lists.forEach(function(bar){
                addflag(bar)
            })
            lists = block.querySelectorAll("a.store_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })


            block = document.getElementById('module_deep_dive')
            lists = block.querySelectorAll("a.store_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })

            block = document.getElementById('module_recommender')
            lists = block.querySelectorAll("a.store_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })


            block = document.getElementById('recommended_creators_carousel')
            lists = block.querySelectorAll("a.store_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })

            block = document.querySelector('div.specials_under10_content')
            lists = block.querySelectorAll("a.store_capsule")
            lists.forEach(function(bar){
                addflag(bar)
            })

            block = document.querySelector('div.marketingmessage_area')
            lists = block.querySelectorAll("a.home_marketing_message")
            lists.forEach(function(bar){
                addflag(bar)
            })

        }else{
            setTimeout(observer_3,200)
        }
    }

    function observer_2(){
        let block = document.querySelector('div.queue_and_playtime')
        if(block){
            appid = Number(url.split('/')[2])
            if(saves.familyGameList.GameList.includes(appid)){
                addBanner(block,appid)
            }
        }else{
            setTimeout(observer_2,200)
        }
    }
    function addflag(node,insertBeforeStyle){
        if(node.querySelector("div.ds_owned_flag")) return;
        let thisurl = node.getAttribute('href')
        let thisappid = null
        if(url.startsWith('store.steampowered.com/category/')){
            if(node.querySelector("div.CapsuleDecorators")&&node.querySelector("div.CapsuleDecorators").childElementCount>0) return;
            thisappid = thisurl.match(/\/app\/[0-9]+/g)[0].slice(5);
            //console.log(thisappid)
            thisurl == null
        }else{
            thisappid = node.getAttribute('data-ds-appid')
            if(!thisappid) thisappid = node.getAttribute('data-app-id')
        }
        //if(true){
        if(thisappid && (thisurl == null || thisurl.startsWith('https://store.steampowered.com/app/')) && saves.familyGameList.GameList.includes(Number(thisappid))){
            if(url.startsWith('/app/')){
                node.classList.add('ds_owned');
            }
            node.classList.add('ds_flagged');
            node.classList.remove('ds_wishlist')
            var flag = document.createElement('div');
            flag.className = "ds_flag ds_owned_flag"
            flag.innerHTML = '在家庭库中&nbsp;&nbsp;'
            flag.style = "background:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAKCAYAAABi8KSDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUNDNzBFNTUyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUNDNzBFNTYyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5Q0M3MEU1MzIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5Q0M3MEU1NDIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv3vUKAAAAAlSURBVHjaYvz//z8DsYARpFhISAivjnfv3jGSp3jUGeQ4AyDAADZHNe2nyOBrAAAAAElFTkSuQmCC') no-repeat 4px 4px #06cfbe"
            if(insertBeforeStyle){
                node.insertBefore(flag, node.querySelector(`[style*="${insertBeforeStyle}"]`).nextSibling);
            }else{
                node.appendChild(flag);
            }
            node.querySelectorAll("div.ds_flag.ds_wishlist_flag").forEach((wishlist_flag)=>{wishlist_flag.remove()})

        }

    }
    function addBanner(block,appid){
        let appname = appHubAppName.innerText
        let owned = false
        let thisgameInfo = saves.familyGameList.GameInfo[appid]
        if(block.querySelector('div.game_area_already_owned.page_content')|| thisgameInfo.owners.includes(steamid)){
            owned = true
            let endplug = document.createElement('div');
            endplug.id = 'see_family_benefactor';
            endplug.style.position = 'relative';
            endplug.style.display = 'inline-block';
            endplug.setAttribute('data-tooltip-text', `您有 ${thisgameInfo.owners.length} 个家庭组成员拥有此游戏`);
            endplug.innerHTML = `<div class="game_area_already_owned_btn">
						             <a class="btnv6_lightblue_blue btnv6_border_2px btn_medium">
			                             <span>查看贡献者</span>
			                         </a>
                                     <div style="position: absolute; top: -5px; right: -8px; background-color: red; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; justify-content: center; align-items: center;">
                                         <span style="font-size: 14px;">${thisgameInfo.owners.length}</span>
                                     </div>
                                 </div>`
            let targetElement = block.querySelector('div.already_owned_actions');
            targetElement.appendChild(endplug);

        }
        if(owned == false){

            let headplug = document.createElement('div');
            let targetElement = block.querySelector('div.queue_overflow_ctn');
            headplug.style = "background:linear-gradient(to right, rgb(6 207 199 / 60%) 0%, rgb(33 105 106 / 60%) 100%);color:#06cfb5"
            headplug.className = "game_area_already_owned page_content"
            headplug.innerHTML =`<div class="game_area_already_owned_ctn" >
				                   <div class="ds_owned_flag ds_flag" style="background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAKCAYAAABi8KSDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUNDNzBFNTUyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUNDNzBFNTYyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5Q0M3MEU1MzIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5Q0M3MEU1NDIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv3vUKAAAAAlSURBVHjaYvz//z8DsYARpFhISAivjnfv3jGSp3jUGeQ4AyDAADZHNe2nyOBrAAAAAElFTkSuQmCC) no-repeat 4px 4px #06cfbe">在家庭库中&nbsp;&nbsp;</div>
				                   <div class="already_in_library" >您的 Steam 家庭库中已有《${appname}》</div>
		                     </div>`

            targetElement.parentNode.insertBefore(headplug, targetElement.nextSibling);


            let endplug = document.createElement('div');
            targetElement = block.querySelector('div.purchase_options_content');
            endplug.className = "game_area_play_stats"
            endplug.innerHTML = `<div class="already_owned_actions">
								       <div class="game_area_already_owned_btn">
									         <a class="btnv6_lightblue_blue btnv6_border_2px btn_medium" href="https://store.steampowered.com/about/?snr=1_5_9__owned-game">
										        <span>安装 Steam</span>
									         </a>
								       </div>
									   <div class="game_area_already_owned_btn">
										     <a class="btnv6_lightblue_blue btnv6_border_2px btn_medium" href="steam://launch/${appid}/Dialog">
										        <span>马上开玩</span>
									         </a>
								       </div>
                                       <div id ="see_family_benefactor" style="position: relative; display: inline-block;" data-tooltip-text="您有 ${thisgameInfo.owners.length} 个家庭组成员拥有此游戏"><div class="game_area_already_owned_btn">
								             <a class="btnv6_lightblue_blue btnv6_border_2px btn_medium">
										        <span>查看贡献者</span>
									         </a>
                                             <div style="position: absolute; top: -5px; right: -8px; background-color: red; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; justify-content: center; align-items: center;">
                                                 <span style="font-size: 14px;">${thisgameInfo.owners.length}</span>
                                             </div>
                                       </div></div>

							     </div>
					             <div style="clear:left;"></div>`
            targetElement.parentNode.insertBefore(endplug, targetElement);
        }
        (function observer_1(){
            let btn = document.getElementById('see_family_benefactor')
            if(btn){
                let innerHTML = `<div style='margin-bottom:6px;'>您有 ${thisgameInfo.owners.length} 个家庭组成员拥有此游戏：</div>`
                    thisgameInfo.owners.forEach((steamid)=>{
                        innerHTML+= `<div style='margin-bottom:6px;'>${saves.familyInfo.steamIdtoName[steamid]}</div>`
                    })
                innerHTML+= `<div style='margin-bottom:6px;'>--------------------------------------------</div>
                    <div style='margin-bottom:6px;'>该游戏最早由【${saves.familyInfo.steamIdtoName[thisgameInfo.owners[0]]}】购入。</div>`
                    btn.onclick = function(){
                        ShowAlertDialog(`【${saves.familyInfo.family_name}】游戏贡献者`,innerHTML,'好的')
                    }
            }else{
                setTimeout(observer_1,200)
            }
        })();

    }

    function getGameAppid(element){
        return Number(element.firstChild.firstChild.getAttribute('src').split('/')[5])
    }
    function getGameCounts(containGames_panel){
        return Number(containGames_panel.querySelector('div.LP9H7bBiPB8N8jFzCQumL').lastChild.innerText.match(/\d*/)[0])
    }
})();

function scan(isdialog){
    saves.noPrompt = false
    if(isdialog){
        ShowConfirmDialog('提示','即将开始扫描，请确认已加入一个有效的家庭组，否则脚本可能会出错，扫描期间不要关闭浏览器，耐心等待！','好的，开始扫描').done(()=>{
            dialog = ShowBlockingWaitDialog('正在扫描家庭组库存...')
            start()
        })
    }else{
        start()
    }


    function start(){
        getfamilyInfo(access_token).then((returnjson) => {
            saves.familyInfo = returnjson
            savestorage()
            getfamilyGameList(access_token,saves.familyInfo.family_groupid).then((returnjson) => {
                saves.familyGameList = returnjson
                saves.lastupDateTime = g_ServerTime
                savestorage()
                if(isdialog){
                    dialog.Dismiss()
                    ShowAlertDialog('完成',`已将${saves.familyGameList.GameList.length}个家庭库游戏记录到本地缓存。`,'好的')
                }
            })
        })
    }
}


function getfamilyGameList(access_token,family_groupid){

    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        var json = null
        var returnjson = {"GameList":[],"GameInfo":{}}
        xhr.open("GET", `https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token=${access_token}&family_groupid=${family_groupid}&include_own=true&include_excluded=false&include_non_games=false`, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                json = JSON.parse(xhr.responseText).response;
                if(json){
                    json.apps.forEach((app)=>{
                        if(app.exclude_reason == 0){
                            returnjson.GameList.push(app.appid)
                            returnjson.GameInfo[app.appid] = {
                                "name":app.name,
                                "owners":app.owner_steamids,
                                "time":app.rt_time_acquired,
                                "icon_hash":app.img_icon_hash}
                        }
                    })
                    returnjson.GameList.sort(function(a, b) {

                        if (returnjson.GameInfo[a].time > returnjson.GameInfo[b].time) {
                            return -1; // a 应在 b 前面
                        }else{
                            return 1; // b 应在 a 前面
                        }
                    });

                    resolve(returnjson)
                    /*  由于获取家庭库数据和本地数据无法的得到准确自身游戏，原本是用来设计为获取完整自身游戏的请求，但该请求必须Steam客户端在线才有内容返回，故取消此设计
                        getMyGame(access_token).then((apps)=>{
                            apps.forEach((app)=>{
                                if(returnjson.GameInfo[app.appid] !== undefined){
                                    if(!returnjson.GameInfo[app.appid].owners.includes(steamid)){
                                        returnjson.GameInfo[app.appid].owners.push(steamid)
                                    }
                                }
                            })
                            resolve(returnjson)
                        }).catch((err)=>{
                            console.error(err)
                            resolve(returnjson)
                        })
                        */
                }
            } else {
                console.error("请求出错:", xhr.statusText);
            }
        };
        xhr.send();
    });
}

function getfamilyInfo(access_token){
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        var json
        xhr.open("GET", `https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token=${access_token}&include_family_group_response=true`, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                json = JSON.parse(xhr.responseText).response;
                if(json){
                    var returnjson = {
                        "family_groupid":json.family_groupid,
                        "family_name":json.family_group.name,
                        "family_member":json.family_group.members,
                        "steamIdtoName":{},
                        "avatarMap":{}
                    }

                    getUserNameBySteamId(access_token,json.family_group.members).then((ret)=>{
                        returnjson.family_member = ret.family_member
                        returnjson.steamIdtoName = ret.steamIdtoName
                        returnjson.avatarMap = ret.avatarMap
                        resolve(returnjson)
                    })
                }

            } else {
                reject("请求出错:", xhr.statusText);
            }
        };
        xhr.send();


    })
}


//该函数弃用
function getMyGame(access_token){
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        var json
        xhr.open("GET", `https://store.steampowered.com/dynamicstore/userdata/`, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                json = JSON.parse(xhr.responseText);
                if(json){
                    if(Object.keys(json).length == 0){

                        reject("请求自身拥有游戏返回空白。");
                    }else{
                        var returnjson = json.rgOwnedApps
                        resolve(returnjson)
                    }
                }

            } else {
                reject("请求出错:", xhr.statusText);
            }
        };
        xhr.send();
    })
}
function getUserNameBySteamId(access_token,family_member) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        var json = null
        var steamIdtoName ={}
        var avatarMap = {}
        var url = `https://api.steampowered.com/IPlayerService/GetPlayerLinkDetails/v1/?access_token=${access_token}`
        let i = 0
        family_member.forEach((member)=>{
            url+=`&steamids[${i}]=${member.steamid}`
            i++
        })

        xhr.open("GET",url , true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                json = JSON.parse(xhr.responseText).response;
                if(json){
                    json.accounts.forEach((user)=>{
                        let i = 0
                        family_member.forEach((member)=>{
                            if(member.steamid == user.public_data.steamid){
                                family_member[i].userName = user.public_data.persona_name
                                family_member[i].avatar = user.public_data.avatar_hash
                            }
                            i++
                        })
                        steamIdtoName[user.public_data.steamid]=user.public_data.persona_name
                        avatarMap[user.public_data.steamid]=user.public_data.avatar_hash
                    })
                    resolve({family_member:family_member,steamIdtoName:steamIdtoName,avatarMap:avatarMap})
                }
            } else {
                console.error("请求出错:", xhr.statusText);
            }
        };
        xhr.send();
    });
}



function readstorage(){
    let newsaves = {
        version : 20240428,
        familyGameList:{"GameList":[],"GameInfo":{}},
        familyInfo:{"family_groupid":null,
                    "family_name":null,
                    "family_member":{},
                    "steamIdtoName":{},
                    "avatarMap":{}},
        lastupDateTime:0,
        steamid:"",
        settings:{isAutoScan:true}
    }
    try{
        var save = GM_getValue('saves')
        if(save !== undefined){
            if(save.version == newsaves.version){
                saves = save
            }else{
                isupdate=true
                savestorage(true)
                saves = newsaves
                if(window.location.host == "store.steampowered.com"){
                    ShowConfirmDialog('脚本提示','脚本缓存列表结构升级，缓存的家庭库列表需要重新扫描！','扫描家庭库','取消').done(()=>{scan(true)}).fail(()=>{
                        ShowAlertDialog('脚本提示','如果需要手动扫描，可以在Steam主页右上角进入进行扫描','好的')
                    })
                }else if(window.location.host == "keylol.com"){
                    if (save?.noPrompt == null || save?.noPrompt == false){
                        alert("家庭游戏标记脚本提示：脚本缓存列表结构升级，缓存的家庭库列表需要重新扫描，请进入steam商店页面按提示扫描！")
                        save.noPrompt = true
                        saves = save
                        savestorage()
                    }
                }
                //newsaves.familyGameList.GameList = saves.familyGameList
                //newsaves.lastupDateTime = saves.lastupDateTime//存档结构升级，兼容旧版
            }
        }else{
            if(window.location.host == "keylol.com"){
                alert("家庭游戏标记脚本提示：您好像是第一次启动脚本，请进入steam商店页面按提示扫描家庭库！")
            }
            isNewUser = true
            GM_setValue('saves',newsaves)
            saves = newsaves
        }
    }catch(e){
        isupdate=true
        savestorage(true)
        saves = newsaves
        ShowConfirmDialog('脚本提示','保存内容读取错误，缓存的家庭库列表需要重新扫描！','扫描家庭库','取消').done(()=>{scan(true)}).fail(()=>{
            ShowAlertDialog('脚本提示','如果需要手动扫描，可以在Steam主页右上角进入进行扫描','好的')
        })
    }
}
function savestorage(isdelete){
    if(isdelete) {
        GM_deleteValue('saves')
        saves = null
        return;
    }
    GM_setValue('saves',saves)
}
function timestampToTime(timestamp) {
    if(timestamp == 0){return '无记录'}
    timestamp = timestamp ? timestamp : null;
    timestamp *= 1000
    let date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    let h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    let m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    let s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return Y + M + D + h + m + s;
}