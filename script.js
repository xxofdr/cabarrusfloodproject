document.addEventListener("DOMContentLoaded", function () {

  // =====================================================
  // CABARRUS FLOOD SMART INTAKE
  // LIVE CABARRUS COUNTY GIS PROPERTY LOOKUP
  // =====================================================


  // =====================================================
  // HTML ELEMENTS
  // =====================================================

  const searchButton =
    document.querySelector("#searchButton");

  const propertyInput =
    document.querySelector("#pinInput");

  const searchInputResult =
    document.querySelector("#searchInput");

  const oldPinResult =
    document.querySelector("#oldPinResult");

  const pin14Result =
    document.querySelector("#pin14Result");

  const ownerResult =
    document.querySelector("#ownerResult");

  const propertyStatus =
    document.querySelector("#propertyStatus");

  const statusMessage =
    document.querySelector("#statusMessage");


  // =====================================================
  // WORKFLOW ELEMENTS
  // =====================================================

  const step1 =
    document.querySelector("#step1");

  const step2 =
    document.querySelector("#step2");


  // =====================================================
  // CABARRUS COUNTY GIS SERVICE
  // =====================================================

  const parcelService =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/Parcels/MapServer/0/query";


  // =====================================================
  // SAFETY CHECK
  // =====================================================

  if (
    !searchButton ||
    !propertyInput ||
    !searchInputResult ||
    !oldPinResult ||
    !pin14Result ||
    !ownerResult ||
    !propertyStatus ||
    !statusMessage
  ) {

    console.error(
      "Flood Smart Intake Error: Required HTML elements were not found."
    );

    return;

  }


  // =====================================================
  // SEARCH FUNCTION
  // =====================================================

  async function searchProperty() {

    const searchValue =
      propertyInput.value.trim();


    // =================================================
    // VALIDATE SEARCH
    // =================================================

    if (!searchValue) {

      statusMessage.textContent =
        "Please enter a Property PIN, Legacy PIN, or Parcel Number.";

      propertyStatus.textContent =
        "Waiting for valid search input";

      propertyInput.focus();

      return;

    }


    // =================================================
    // START SEARCH
    // =================================================

    searchButton.disabled = true;

    searchButton.textContent =
      "Searching...";


    statusMessage.textContent =
      "Searching Cabarrus County GIS...";


    propertyStatus.textContent =
      "Searching GIS...";


    // =================================================
    // RESET RESULTS
    // =================================================

    searchInputResult.textContent =
      searchValue;

    oldPinResult.textContent =
      "—";

    pin14Result.textContent =
      "—";

    ownerResult.textContent =
      "—";


    try {


      // ===============================================
      // BUILD GIS QUERY
      //
      // Searches:
      //
      // PIN
      // PIN14
      // OLDPIN
      // ===============================================

      const whereClause =
        "PIN = '" + searchValue + "'" +
        " OR PIN14 = '" + searchValue + "'" +
        " OR OLDPIN = '" + searchValue + "'";


      // ===============================================
      // QUERY PARAMETERS
      // ===============================================

      const params =
        new URLSearchParams({

          where: whereClause,

          outFields:
            "PIN14,PIN,OLDPIN,AcctName1,AcctName2,CALCULATED_ACREAGE,PropertyReal_ID",

          returnGeometry:
            "true",

          f:
            "json"

        });


      // ===============================================
      // BUILD URL
      // ===============================================

      const requestURL =
        parcelService +
        "?" +
        params.toString();


      console.log(
        "Cabarrus GIS Request:",
        requestURL
      );


      // ===============================================
      // CALL CABARRUS GIS
      // ===============================================

      const response =
        await fetch(requestURL);


      if (!response.ok) {

        throw new Error(
          "GIS server returned HTTP " +
          response.status
        );

      }


      const data =
        await response.json();


      console.log(
        "Cabarrus GIS Response:",
        data
      );


      // ===============================================
      // GIS ERROR CHECK
      // ===============================================

      if (data.error) {

        throw new Error(
          data.error.message ||
          "Cabarrus GIS returned an error."
        );

      }


      // ===============================================
      // NO PROPERTY FOUND
      // ===============================================

      if (
        !data.features ||
        data.features.length === 0
      ) {

        statusMessage.textContent =
          "No matching Cabarrus County property was found.";

        propertyStatus.textContent =
          "Property Not Found";

        return;

      }


      // ===============================================
      // GET FIRST MATCHING PROPERTY
      // ===============================================

      const feature =
        data.features[0];


      const attributes =
        feature.attributes;


      // ===============================================
      // PROPERTY IDENTIFIERS
      // ===============================================

      searchInputResult.textContent =
        searchValue;


      oldPinResult.textContent =
        attributes.OLDPIN ||
        attributes.PIN ||
        "Not Available";


      pin14Result.textContent =
        attributes.PIN14 ||
        "Not Available";


      // ===============================================
      // OWNER NAME
      // ===============================================

      const ownerParts = [];


      if (attributes.AcctName1) {

        ownerParts.push(
          attributes.AcctName1
        );

      }


      if (attributes.AcctName2) {

        ownerParts.push(
          attributes.AcctName2
        );

      }


      ownerResult.textContent =
        ownerParts.length > 0
          ? ownerParts.join(" ")
          : "Not Available";


      // ===============================================
      // PROPERTY STATUS
      // ===============================================

      propertyStatus.textContent =
        "Property Identified";


      // ===============================================
      // STATUS MESSAGE
      // ===============================================

      statusMessage.textContent =
        "Property successfully identified from Cabarrus County GIS. Ready for parcel geometry lookup.";


      // ===============================================
      // STORE PROPERTY DATA
      //
      // This will be used by later workflow steps.
      // ===============================================

      window.currentProperty = {

        searchValue:
          searchValue,

        pin:
          attributes.PIN,

        pin14:
          attributes.PIN14,

        oldPin:
          attributes.OLDPIN,

        owner:
          ownerParts.join(" "),

        acreage:
          attributes.CALCULATED_ACREAGE,

        realId:
          attributes.PropertyReal_ID,

        geometry:
          feature.geometry

      };


      console.log(
        "Current Property:",
        window.currentProperty
      );


      // ===============================================
      // WORKFLOW
      // ===============================================

      if (step1) {

        step1.classList.add(
          "active"
        );

      }


      if (step2) {

        step2.classList.remove(
          "active"
        );

      }


    }


    // =================================================
    // ERROR HANDLING
    // =================================================

    catch (error) {

      console.error(
        "Cabarrus GIS Search Error:",
        error
      );


      statusMessage.textContent =
        "Unable to retrieve property information from Cabarrus County GIS.";


      propertyStatus.textContent =
        "GIS Search Error";


      // Clear results

      oldPinResult.textContent =
        "—";

      pin14Result.textContent =
        "—";

      ownerResult.textContent =
        "—";


    }


    // =================================================
    // RESTORE BUTTON
    // =================================================

    finally {

      searchButton.disabled =
        false;


      searchButton.textContent =
        "🔎 Search GIS";

    }

  }


  // =====================================================
  // SEARCH BUTTON CLICK
  // =====================================================

  searchButton.addEventListener(
    "click",
    searchProperty
  );


  // =====================================================
  // ENTER KEY
  // =====================================================

  propertyInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        searchProperty();

      }

    }
  );


});