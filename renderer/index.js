'use strict'

const { ipcRenderer } = require('electron')

// delete website by its text value ( used below in event listener)
const deleteWebsite = (e) => {
    console.log(e.target);
    //ipcRenderer.send('delete-website', e.target.textContent);
}

function get_days_left(date_string) {
    var now = Date.now();
    var then = new Date(Date.parse(date_string));
    var days_left = Math.round((then - now) / 86400000);
    return days_left;
};

// create add website window button
document.getElementById('createWebsiteBtn').addEventListener('click', () => {
    //ipcRenderer.send('add-website-window')
    document.getElementById("add-popup").classList.add("show-popup");
});

document.getElementById('emptyCreateWebsiteBtn').addEventListener('click', () => {
    //ipcRenderer.send('add-website-window');
    document.getElementById("add-popup").classList.add("show-popup");
});

document.getElementById('close-popup').addEventListener('click', () => {
    resetMonitorForm();
});

var filters = document.querySelectorAll(".filter > li");

for (const filter of filters) {
    filter.addEventListener('click', function(e) {
        var elems = document.querySelector(".active");
        if(elems !==null){
            elems.classList.remove("active");
        }
        e.target.className = "active";
        filterWebsites(e.target.getAttribute("id"));
    })
}

function filterWebsites(currentFilter) {

    var websites = document.querySelectorAll(".card");

    for(var i=0; i < websites.length; i++) {
        websites[i].parentNode.style.display = "none";
    }

    if (currentFilter == "expiring-websites") {

        websites = document.querySelectorAll(".card-expiring");

    } else if (currentFilter == "expired-websites") {

        websites = document.querySelectorAll(".card-expired");

    }

    for(var i=0; i < websites.length; i++) {
        websites[i].parentNode.style.display = "block";
    }

}

document.getElementById('add-website').addEventListener('click', (evt) => {
    // prevent default refresh functionality of forms
    evt.preventDefault();
    document.getElementById("website-error-message").innerHTML = "";

    // input on the form
    const name = document.getElementById("Name").value,
        host = document.getElementById("Host").value,
        port = document.getElementById("Port").value || 443;

    if(name != "" && host != "") {

        document.getElementById("Name").nextElementSibling.innerText = ""
        document.getElementById("Host").nextElementSibling.innerText = ""

        // send website to main process
        ipcRenderer.send('add-website', {
            "name": name,
            "host": host,
            "port": port
        });

    } else {

        if(name == "") {
            document.getElementById("Name").nextElementSibling.innerText = "Please enter a name for this monitor."
        }

        if(!(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(host))) {
            document.getElementById("Host").nextElementSibling.innerText = "Please enter a valid host name. Eg: www.google.com, google.com etc."
        }

    }
});

// send website to main process
ipcRenderer.send('get-websites');

ipcRenderer.on("website-exists", event => {
    document.getElementById("Host").nextElementSibling.innerText = "Hostname already exists."
});

ipcRenderer.on("website-error", (event, err) => {
    document.getElementById("website-error-message").innerHTML = `<p>Error Code: <b>${err.errorCode}</b></p><p>Description: <b>${err.description}</b></p>`
});

let monitorToDelete = "";

// on receive websites
ipcRenderer.on('websites', (event, websites) => {

    resetMonitorForm();
    resetDeleteAlert();

    if(websites.length == 0) {
        document.getElementById("empty-block").classList.remove("hidden-element");
        document.getElementById("stats").classList.add("hidden-element");
        document.getElementById("all-monitors").classList.add("hidden-element");
    } else {
        document.getElementById("empty-block").classList.add("hidden-element");
        document.getElementById("stats").classList.remove("hidden-element");
        document.getElementById("all-monitors").classList.remove("hidden-element");
    }

    //get the websiteList ul
    const websiteList = document.getElementById('website-list');

    document.getElementById("valid-certificates").innerText = websites.filter(website => get_days_left(website.info.valid_to) > 21).length;
    document.getElementById("expiring-certificates").innerText = websites.filter(website => get_days_left(website.info.valid_to) >= 0 && get_days_left(website.info.valid_to) < 21).length;
    document.getElementById("expired-certificates").innerText = websites.filter(website => get_days_left(website.info.valid_to) <= 0).length;

    document.getElementById("website-header").innerText = `${websites.length} Monitor${websites.length != 1 ? "s" : ""}`;

    // create html string
    const websiteItems = websites.reduce((html, website) => {

        let daysLeft = get_days_left(website.info.valid_to);

        html += `<div class="col-4">

            <div class="card ${daysLeft >= 21 ? "" : (daysLeft >= 0 ? "card-expiring" : "card-expired")}">

                <h2>${website.name}</h2>
                <div class="card-content">
                    <h1>${daysLeft} <span>day${daysLeft != 1 ? "s" : ""} left</span></h1>
                    <p><span>Domain:</span> ${website.server}</p>
                    <p><span>Issued by:</span> ${website.issuer.org}</p>
                </div>
                <div class="remove-website" data-website-host="${website.server}">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik05IDNoNnYtMS43NWMwLS4wNjYtLjAyNi0uMTMtLjA3My0uMTc3LS4wNDctLjA0Ny0uMTExLS4wNzMtLjE3Ny0uMDczaC01LjVjLS4wNjYgMC0uMTMuMDI2LS4xNzcuMDczLS4wNDcuMDQ3LS4wNzMuMTExLS4wNzMuMTc3djEuNzV6bTExIDFoLTE2djE4YzAgLjU1Mi40NDggMSAxIDFoMTRjLjU1MiAwIDEtLjQ0OCAxLTF2LTE4em0tMTAgMy41YzAtLjI3Ni0uMjI0LS41LS41LS41cy0uNS4yMjQtLjUuNXYxMmMwIC4yNzYuMjI0LjUuNS41cy41LS4yMjQuNS0uNXYtMTJ6bTUgMGMwLS4yNzYtLjIyNC0uNS0uNS0uNXMtLjUuMjI0LS41LjV2MTJjMCAuMjc2LjIyNC41LjUuNXMuNS0uMjI0LjUtLjV2LTEyem04LTQuNXYxaC0ydjE4YzAgMS4xMDUtLjg5NSAyLTIgMmgtMTRjLTEuMTA1IDAtMi0uODk1LTItMnYtMThoLTJ2LTFoN3YtMmMwLS41NTIuNDQ4LTEgMS0xaDZjLjU1MiAwIDEgLjQ0OCAxIDF2Mmg3eiIvPjwvc3ZnPg==">
                </div>
                <div class="refresh-website" data-website-host="${website.server}">
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik03IDloLTd2LTdoMXY1LjJjMS44NTMtNC4yMzcgNi4wODMtNy4yIDExLTcuMiA2LjYyMyAwIDEyIDUuMzc3IDEyIDEycy01LjM3NyAxMi0xMiAxMmMtNi4yODYgMC0xMS40NS00Ljg0NC0xMS45NTktMTFoMS4wMDRjLjUwNiA1LjYwMyA1LjIyMSAxMCAxMC45NTUgMTAgNi4wNzEgMCAxMS00LjkyOSAxMS0xMXMtNC45MjktMTEtMTEtMTFjLTQuNjYgMC04LjY0NyAyLjkwNC0xMC4yNDkgN2g1LjI0OXYxeiIvPjwvc3ZnPg==">
                </div>

            </div>


        </div>`;

        return html
    }, '');

    // set list html to the website items
    websiteList.innerHTML = websiteItems

    // add click handlers to delete the clicked website
    websiteList.querySelectorAll('.remove-website').forEach(item => {
        removeWebsiteElem(item);
    });

    // add click handlers to refresh the certificate of clicked website
    websiteList.querySelectorAll('.refresh-website').forEach(item => {
        item.addEventListener('click', () => {
            ipcRenderer.send('refresh-website', item.getAttribute("data-website-host"));
        });
    });

});

document.getElementById('close-delete-popup').addEventListener('click', () => {
    document.getElementById("alert-popup").classList.remove("show-popup");
});

document.getElementById('delete-monitor').addEventListener('click', () => {
    ipcRenderer.send("delete-website", monitorToDelete);
});

function removeWebsiteElem(elem) {
    elem.addEventListener('click', () => {
        monitorToDelete = elem.getAttribute("data-website-host");
        document.getElementById("alert-popup").classList.add("show-popup");
    });
}

function resetMonitorForm() {

    document.getElementById("add-popup").classList.remove("show-popup");
    document.getElementById("website-error-message").innerHTML = "";
    document.getElementById("Name").nextElementSibling.innerText = ""
    document.getElementById("Host").nextElementSibling.innerText = ""
    // reset input
    document.getElementById("Name").value = '';
    document.getElementById("Host").value = '';
    document.getElementById("Port").value = '';

}

function resetDeleteAlert() {

    document.getElementById("alert-popup").classList.remove("show-popup");
    monitorToDelete = null;

}