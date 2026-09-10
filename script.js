// =====================================================
// CABARRUS FLOOD SMART INTAKE
// Property Search - Public GIS Services
// =====================================================


// -----------------------------------------------------
// PUBLIC CABARRUS COUNTY GIS ENDPOINT
// -----------------------------------------------------

const GIS_SERVICE =
  "https://location.cabarruscounty.us/arcgisservices/rest/services/views/landrecords_view/MapServer/3/query";


// -----------------------------------------------------
// PAGE ELEMENTS
// -----------------------------------------------------

const pinInput = document.getElementById("pinInput");
const searchButton = document.getElementById("searchButton");

const statusMessage = document.getElementById("statusMessage");

const searchInputResult = document.getElementById("searchInput");
const oldPinResult = document.getElementById("oldPinResult");
const pin14Result = document.getElementById("pin14Result");
const ownerResult = document.getElementById("ownerResult");
const propertyStatus = document.getElementById("propertyStatus");


// -----------------------------------------------------
// SEARCH BUTTON
// -----------------------------------------------------

searchButton.addEventListener("click", searchProperty);


// Allow ENTER key to search

pinInput.addEventListener("keydown", function (event) {

  if (event.key === "Enter") {

    searchProperty();

  }

});


// -----------------------------------------------------
// MAIN PROPERTY SEARCH
// -----------------------------------------------------

async function searchProperty() {

  const searchValue = pinInput.value.trim();


  // ---------------------------------------------------
  // VALIDATE INPUT
  // ---------------------------------------------------

  if (!searchValue) {

    setStatus(
      "Please enter a Property PIN, Legacy PIN, or Parcel Number."
    );

    propertyStatus.textContent = "Waiting for valid input";

    return;

  }


  // Display search input

  searchInputResult.textContent = searchValue;


  // Reset results

  oldPinResult.textContent = "Searching...";
  pin14Result.textContent = "Searching...";
  ownerResult.textContent = "Searching...";
  propertyStatus.textContent = "Searching...";


  // Update interface

  searchButton.disabled = true;

  searchButton.textContent = "Searching...";


  setStatus(
    "Searching Cabarrus County public property records..."
  );


  try {


    // -------------------------------------------------
    // SEARCH MULTIPLE PROPERTY IDENTIFIERS
    // -------------------------------------------------

    const whereClause = `
      PIN14 = '${escapeSql(searchValue)}'
      OR PIN = '${escapeSql(searchValue)}'
      OR OLDPIN = '${escapeSql(searchValue)}'
      OR PARCEL = '${escapeSql(searchValue)}'
      OR PropertyReal_ID = '${escapeSql(searchValue)}'
    `;


    // Remove line breaks

    const cleanWhereClause =
      whereClause.replace(/\s+/g, " ").trim();


    // -------------------------------------------------
    // BUILD GIS REQUEST
    // -------------------------------------------------

    const params = new URLSearchParams({

      where: cleanWhereClause,

      outFields:
        "PIN14,PIN,OLDPIN,PARCEL,PropertyReal_ID,AcctName1,AcctName2",

      returnGeometry: "false",

      resultRecordCount: "10",

      f: "json"

    });


    const requestUrl =
      `${GIS_SERVICE}?${params.toString()}`;


    // -------------------------------------------------
    // SEND REQUEST
    // -------------------------------------------------

    const response =
      await fetch(requestUrl);


    // Check HTTP response

    if (!response.ok) {

      throw new Error(
        `GIS service returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    // -------------------------------------------------
    // CHECK FOR GIS ERROR
    // -------------------------------------------------

    if (data.error) {

      throw new Error(
        data.error.message ||
        "The GIS service returned an error."
      );

    }


    // -------------------------------------------------
    // CHECK FOR RESULTS
    // -------------------------------------------------

    if (
      !data.features ||
      data.features.length === 0
    ) {

      handlePropertyNotFound(searchValue);

      return;

    }


    // -------------------------------------------------
    // USE FIRST MATCH
    // -------------------------------------------------

    const property =
      data.features[0].attributes;


    displayProperty(property);


  }


  // ---------------------------------------------------
  // HANDLE ERRORS
  // ---------------------------------------------------

  catch (error) {

    console.error(
      "Cabarrus GIS Search Error:",
      error
    );


    setStatus(
      "Unable to complete the GIS search. Please try again."
    );


    oldPinResult.textContent = "—";

    pin14Result.textContent = "—";

    ownerResult.textContent = "—";

    propertyStatus.textContent =
      "GIS Search Error";

  }


  // ---------------------------------------------------
  // RESTORE BUTTON
  // ---------------------------------------------------

  finally {

    searchButton.disabled = false;

    searchButton.textContent =
      "🔎 Search GIS";

  }

}


// =====================================================
// DISPLAY PROPERTY
// =====================================================

function displayProperty(property) {


  // ---------------------------------------------------
  // PIN14
  // ---------------------------------------------------

  pin14Result.textContent =
    property.PIN14 || "Not Available";


  // ---------------------------------------------------
  // LEGACY PIN
  // ---------------------------------------------------

  oldPinResult.textContent =
    property.OLDPIN ||
    property.PIN ||
    "Not Available";


  // ---------------------------------------------------
  // OWNER
  // ---------------------------------------------------

  const ownerParts = [];


  if (property.AcctName1) {

    ownerParts.push(property.AcctName1);

  }


  if (property.AcctName2) {

    ownerParts.push(property.AcctName2);

  }


  ownerResult.textContent =
    ownerParts.length > 0
      ? ownerParts.join(" ")
      : "Not Available";


  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  propertyStatus.textContent =
    "Property Identified";


  setStatus(
    "Property successfully identified in Cabarrus County public property records."
  );


  // ---------------------------------------------------
  // WORKFLOW
  // ---------------------------------------------------

  activateWorkflowStep(1);


  console.log(
    "Property Record:",
    property
  );

}


// =====================================================
// PROPERTY NOT FOUND
// =====================================================

function handlePropertyNotFound(searchValue) {


  oldPinResult.textContent = "—";

  pin14Result.textContent = "—";

  ownerResult.textContent = "—";


  propertyStatus.textContent =
    "Property Not Found";


  setStatus(
    `No matching property was found for "${searchValue}" in the Cabarrus County public property records.`
  );

}


// =====================================================
// STATUS MESSAGE
// =====================================================

function setStatus(message) {

  statusMessage.textContent = message;

}


// =====================================================
// WORKFLOW ACTIVATION
// =====================================================

function activateWorkflowStep(stepNumber) {


  const steps =
    document.querySelectorAll(".workflow-step");


  steps.forEach(function (step) {

    step.classList.remove("active");

  });


  const activeStep =
    document.getElementById(
      `step${stepNumber}`
    );


  if (activeStep) {

    activeStep.classList.add("active");

  }

}


// =====================================================
// BASIC SQL ESCAPING
// =====================================================

function escapeSql(value) {

  return String(value).replace(
    /'/g,
    "''"
  );

}
