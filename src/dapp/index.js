
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('', 'Contract Operational Status', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    
        console.log("Flights Added : ",contract.flights);

        populateFlights(contract.flights);

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            //let flight = DOM.elid('flight-number').value;

            let flightsSelect = DOM.elid("flights");
            let flight = JSON.parse(flightsSelect.options[flightsSelect.selectedIndex].value);
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: JSON.stringify(result)} ]);
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            
            let flightsSelect = DOM.elid("insured-flights");
            let flight = JSON.parse(flightsSelect.options[flightsSelect.selectedIndex].value);
            let insuredAmount = DOM.elid("insured-amount").value;
            // Write transaction
            
            contract.buyInsurance(flight, insuredAmount, (error, result) => {
                if (error) {
                    console.log(error.toString());
                }
                display('', 'Insurance Bought', [ { label: 'Flight Insured', error: error, value: JSON.stringify(result)} ]);
            });
        })
    
    });
    

})();

function populateFlights(flights) {
    let flightsSelect = DOM.elid("flights");
    let insuredflightsSelect = DOM.elid("insured-flights");

    flights.forEach(element => {
        var opt = DOM.makeElement('option');
        opt.value = JSON.stringify(element);
        opt.innerHTML = element.name + "(" + element.airlineName + ")";
        flightsSelect.appendChild(opt);
    });

    flights.forEach(element => {
        var opt = DOM.makeElement('option');
        opt.value = JSON.stringify(element);
        opt.innerHTML = element.name + "(" + element.airlineName + ")";
        insuredflightsSelect.appendChild(opt);
    });
}

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







