// Help function

/**
 *  modal pop alert
 */
document.addEventListener('DOMContentLoaded', function () {
    function pop(openFn, closeFn) {
        if (window['pop'] === undefined) {
            const content = `
        <style>
            /* The Modal (background) */
            #aLongNameToAvoidConflictingFor_modal {
                display: none; /* Hidden by default */
                position: fixed; /* Stay in place */
                z-index: 1; /* Sit on top */
                padding-top: 100px; /* Location of the box */
                left: 0;
                top: 0;
                width: 100%; /* Full width */
                height: 100%; /* Full height */
                overflow: auto; /* Enable scroll if needed */
                background-color: rgb(0, 0, 0); /* Fallback color */
                background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
            }
            /* Modal Content */
            .aLongNameToAvoidConflictingFor_modal-content {
                background-color: #fefefe;
                margin: auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
            }
            /* The Close Button */
            .aLongNameToAvoidConflictingFor_close {
                color: #aaaaaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .aLongNameToAvoidConflictingFor_close:hover,
            .aLongNameToAvoidConflictingFor_close:focus {
                color: #000;
                text-decoration: none;
                cursor: pointer;
            }
        </style>
        <div id="aLongNameToAvoidConflictingFor_modal">
            <div class="aLongNameToAvoidConflictingFor_modal-content">
            <span class="aLongNameToAvoidConflictingFor_close">&times;</span>
            <p></p>
            </div>
        </div>`
            document.body.insertAdjacentHTML("beforeend", content);
            const modal = document.getElementById("aLongNameToAvoidConflictingFor_modal");
            const span = document.getElementsByClassName("aLongNameToAvoidConflictingFor_close")[0];
            span.onclick = function () {
                modal.style.display = "none";
            }
            window['pop'] = {
                openFn: openFn,
                closeFn: closeFn,
                open: function (message, timeout) {
                    modal.querySelector('p').innerHTML = message
                    modal.style.display = "block";
                    if (timeout !== undefined && parseInt(timeout) !== NaN) {
                        setTimeout(function () {
                            if (this.openFn instanceof Function) this.openFn();
                            modal.style.display = "none";
                        }, timeout)
                    } else {
                        if (this.openFn instanceof Function) this.openFn();
                    }
                },
                close: function () {
                    modal.style.display = "none";
                    if (this.closeFn instanceof Function) this.closeFn()
                }
            }
        }
        return window['pop'];
    }

    pop();
})

// config variables

const mapboxAccessToken = "pk.eyJ1IjoiY2M4NjEwMTAiLCJhIjoiY2tqbjI1d2owMmdvNTJ6bXBjbTNvN2xyciJ9.YIrLqKEWtfxVr-CcgXm1MQ";
const mapboxBaseURL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const bbox = "-97.325875, 49.766204, -96.953987, 49.99275" //limit the search in Winnipeg
const winnipegtransitBaseURL = "https://api.winnipegtransit.com/v3/trip-planner.json"
const winnipegtransitKey = "Fci2OUg2KGq4iq3o66Q6"
let map, markObject;




const getAddressObjectListByText = function (text) {
    return fetch(`${mapboxBaseURL}/${text}.json?bbox=${bbox}&access_token=${mapboxAccessToken}`)
        .catch(() => {
            pop.open("Fetch data from server error, please try again later!")
        })
        .then((response) => response.json())
        .then((data) => {
            return data.features.reduce((context, addressObject) => {
                context.push({
                    name: addressObject.text,
                    address: addressObject.properties.address || '',
                    long: addressObject.center[0],
                    lat: addressObject.center[1],
                })
                return context;
            }, []);
        })
}

const renderAddressObjectListToPage = function (addressObjectList, elementContainer) {
    if (addressObjectList.length == 0) {
        elementContainer.innerHTML = `
           <li> <div class="name">No result!</div> </li>
        `
    } else {
        elementContainer.innerHTML = addressObjectList.reduce(function (context, addressObject, index) {
            return context += `
            <li data-long="${addressObject.long}" data-lat="${addressObject.lat}" ${index === 0 ? 'class="selected"' : ''}>
                <div class="name">${addressObject.name}</div>
                <div>${addressObject.address}</div>
            </li>
        `
        }, "")
    }
}

const convertSegmentObjectToHtml = function (segment) {
    switch (segment.type) {
        case "walk":
            return `
                <li>
                    <i class="fas fa-walking" aria-hidden="true"></i>
                    Walk for ${segment.times.durations.total} minutes
                    ${segment.from['stop'] !== undefined ? 'from stop #' + segment.from.stop.key + ' - ' + segment.from.stop.name : ''} 
                    ${segment.to['stop'] !== undefined ? 'to stop #' + segment.to.stop.key + ' - ' + segment.to.stop.name : ''}
                </li>
            `
        case "ride":
            return `
                <li>
                    <i class="fas fa-bus" aria-hidden="true"></i>
                    Ride bus #${segment.bus.key} on the 
                    ${segment.route.name} for ${segment.times.durations.total} minutes.
                </li>
            
            `
        case "transfer":
            return `
                <li>
                    <i class="fas fa-ticket-alt" aria-hidden="true"></i>
                    Transfer from stop #${segment.from.stop.key} - ${segment.from.stop.name} 
                    to stop #${segment.to.stop.key} - ${segment.to.stop.name} 
                </li>
            `
    }
}

const findTheWayObjectByGeo = function (originLat, originLong, destinationLat, destinationLong) {
    return fetch(`${winnipegtransitBaseURL}?api-key=${winnipegtransitKey}&origin=geo/${originLat},${originLong}&destination=geo/${destinationLat},${destinationLong}`)
        .then(response => {
            return response.json()
        })
        .then(data => {
            data.plans.forEach(function (plan) {
                plan.segments.forEach(function (segment) {
                    segment['segmentString'] = convertSegmentObjectToHtml(segment)
                })
            })
            return data.plans
        }).catch(() => {
            pop.open("Fetch data from server error, please try again later!")
        })
}

const convertSegmentsHTMLToString = function(planObject){
    return planObject.segments.reduce(function (context, segmentObjet) {
        return context += segmentObjet.segmentString
    }, "")
}

const renderTripObjectListToPage = function (plansObjectList, elementContainerSelector) {
    if(!(plansObjectList instanceof Array)){
        document.querySelector(elementContainerSelector).innerHTML = `<ul class="my-trip" ></ul>`
    }else if(plansObjectList.length == 0) {
        document.querySelector(elementContainerSelector).innerHTML = `<ul class="my-trip" ><li><h3>No result!</ul>`
    } else {
        document.querySelector(elementContainerSelector).innerHTML = plansObjectList
            .sort(function (a, b) { //sort the array by time
                return a.times.durations.total - b.times.durations.total
            })
            .reduce(function (planBlock, planObject, index) {
                planBlock += `<ul class="my-trip" data-index="${index}">
                                <li><h3>Plan ${index + 1}: (total: ${planObject.times.durations.total} mins) ${index == 0 ? " - recommend" : ""}</h3>
                                </li>
                                ${convertSegmentsHTMLToString(planObject)}
                             </ul>`
                return planBlock
            }, "")
    }
}

const mark = function (longitude, latitude) {
    if (markObject != null) {
        markObject.remove();
    }
    markObject = new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map);
    map.flyTo({center: [longitude, latitude], essential: true});
}

document.addEventListener('DOMContentLoaded', (event) => {

    mapboxgl.accessToken = mapboxAccessToken;
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
        center: [(-97.325875 - 96.953987) / 2, (49.766204 + 49.99275) / 2], // starting position [lng, lat]
        zoom: 14 // starting zoom
    });

    document.querySelector('body').addEventListener("submit", function (event) {
        event.preventDefault()
        if (event.target.matches("form")) {
            const inputValue = event.target.children[0].value
            if (inputValue.trim().length !== 0) {
                getAddressObjectListByText(inputValue)
                    .then(function (addressObjectList) {
                        renderAddressObjectListToPage(addressObjectList, event.target.parentElement.children[1])
                    }.bind(event))
            }
        }
    })

    document.querySelector('body').addEventListener("click", function (event) {
        const li = event.target.closest("li");
        if (li != null) {
            const selectedLi = li.parentElement.querySelector(".selected");
            if (selectedLi != null) {
                selectedLi.classList.remove("selected")
            }
            if (li.dataset.long != undefined && li.dataset.lat != undefined) {
                li.classList.add("selected");
                mark(li.dataset.long, li.dataset.lat)
                const addressName = li.children[0].innerText
                const inputElement = li.parentElement.parentElement.querySelector('input');
                inputElement.value = addressName
            }
        }
    })

    document.querySelector(".plan-trip").addEventListener("click", function (event) {
        const origin = document.querySelector("ul.origins li.selected")
        const destination = document.querySelector("ul.destinations li.selected")
        if (origin == null) {
            return pop.open("The origin address is unavailable!\n")
        }
        if (destination == null) {
            return pop.open("The destination address is unavailable!\n")
        }
        if (origin.dataset.lat === destination.dataset.lat && origin.dataset.long === destination.dataset.long) {
            return pop.open("The destination address can't be the origin address!\n")
        }
        document.querySelector('.bus-container').innerHTML = `<ul class="my-trip" ><li><h3>Loading ...</ul>`
        findTheWayObjectByGeo(origin.dataset.lat, origin.dataset.long, destination.dataset.lat, destination.dataset.long)
            .then(function (tripObjectList) {
                renderTripObjectListToPage(tripObjectList, '.bus-container');
            })
    })

})




