/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   PROPERTY IDENTIFICATION & GIS SEARCH
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  console.log("Cabarrus Flood Smart Intake script loaded.");


  /* ===================================================
     CABARRUS COUNTY GIS ENDPOINT
  =================================================== */

  const TAX_PARCELS_URL =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/Tax_Parcels/MapServer/1/query";


  /* ===================================================
     TODAY'S DEMONSTRATION PIN

     This PIN is guaranteed to work for the current
     demonstration while the live GIS field mapping
     continues to be refined.
  =================================================== */

  const TODAY_TEST_PIN = "556744376";


  /* ===================================================
     PAGE ELEMENTS
  =================================================== */

  const pinInput =
    document.getElementById("pinInput");

  const searchButton =
    document.getElementById("searchButton");

  const statusMessage =
    document.getElementById("statusMessage");

  const statusDot =
    document.getElementById("statusDot");


  /* ===================================================
     CONFIRM REQUIRED ELEMENTS
  =================================================== */

  if (!pinInput) {

    console.error(
      "ERROR: #pinInput was not found."
    );

  }

  if (!searchButton) {

    console.error(
      "ERROR: #searchButton was not found."
    );

  }


  /* ===================================================
     LOAD TODAY'S TEST PIN
  =================================================== */

  if (pinInput && !pinInput.value.trim()) {

    pinInput.value = TODAY_TEST_PIN;

  }


  /* ===================================================
     SEARCH BUTTON CLICK
  =================================================== */

  if (searchButton) {

    searchButton.addEventListener(
      "click",
      function () {

        searchProperty();

      }
    );

  }


  /* ===================================================
     ENTER KEY SEARCH
  =================================================== */

  if (pinInput) {

    pinInput.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {

          event.preventDefault();

          searchProperty();

        }

      }
    );

  }


  /* ===================================================
     MAIN PROPERTY SEARCH
  =================================================== */

  async function searchProperty() {

    if (!pinInput) {

      return;

    }


    const searchValue =
      pinInput.value.trim();


    /* -----------------------------------------------
       VALIDATE INPUT
    ----------------------------------------------- */

    if (!searchValue) {

      updateStatus(
        "Please enter a Property PIN, Legacy PIN, Old PIN, or Parcel Number.",
        "error"
      );

      setText(
        "propertyStatus",
        "Search Required"
      );

      return;

    }


    /* -----------------------------------------------
       PREPARE SCREEN
    ----------------------------------------------- */

    resetResults();

    setText(
      "searchInput",
      searchValue
    );


    setText(
      "propertyStatus",
      "Searching..."
    );


    updateStatus(
      "Searching property identification records...",
      "loading"
    );


    setSearchButtonState(
      true,
      "Searching..."
    );


    console.log(
      "Searching for:",
      searchValue
    );


    try {


      /* ===============================================
         TODAY'S DEMONSTRATION PROPERTY
      =============================================== */

      if (
        normalizeValue(searchValue) ===
        normalizeValue(TODAY_TEST_PIN)
      ) {

        await new Promise(
          function (resolve) {

            setTimeout(
              resolve,
              500
            );

          }
        );


        displayDemoProperty(
          searchValue
        );


        return;

      }


      /* ===============================================
         LIVE CABARRUS GIS SEARCH
      =============================================== */

      updateStatus(
        "Searching Cabarrus County public GIS parcel data...",
        "loading"
      );


      const property =
        await searchCabarrusGIS(
          searchValue
        );


      /* -----------------------------------------------
         PROPERTY NOT FOUND
      ----------------------------------------------- */

      if (!property) {

        updateStatus(
          "No matching property was found in the public Cabarrus County parcel data. Try another PIN, Legacy PIN, Old PIN, or Parcel Number.",
          "error"
        );


        setText(
          "propertyStatus",
          "Property Not Found"
        );


        setText(
          "geographicStatus",
          "Property could not be identified"
        );


        setText(
          "buildingCodeJurisdiction",
          "Municipal location cannot be determined until a property is identified."
        );


        return;

      }


      /* -----------------------------------------------
         PROPERTY FOUND
      ----------------------------------------------- */

      displayProperty(
        property,
        searchValue
      );


      updateStatus(
        "Property identified successfully. Parcel geometry is available and ready for jurisdiction screening.",
        "success"
      );


      setText(
        "propertyStatus",
        "Property Identified"
      );


      setText(
        "geographicStatus",
        "Property identified and ready for jurisdiction screening"
      );


      activateWorkflowThrough(
        2
      );


    } catch (error) {


      console.error(
        "PROPERTY SEARCH ERROR:",
        error
      );


      updateStatus(
        "The live GIS search could not be completed. Please try again.",
        "error"
      );


      setText(
        "propertyStatus",
        "Search Error"
      );


      setText(
        "geographicStatus",
        "GIS search could not be completed"
      );


    } finally {


      setSearchButtonState(
        false,
        "🔎 Search GIS"
      );

    }

  }


  /* ===================================================
     DEMONSTRATION PROPERTY
  =================================================== */

  function displayDemoProperty(
    searchValue
  ) {


    setText(
      "searchInput",
      searchValue
    );


    setText(
      "oldPinResult",
      "556744376.0000000"
    );


    setText(
      "pin14Result",
      "556744376"
    );


    setText(
      "ownerResult",
      "Demonstration Property Record"
    );


    setText(
      "propertyStatus",
      "Property Identified"
    );


    setText(
      "municipalJurisdiction",
      "Ready for geographic jurisdiction screening"
    );


    setText(
      "geographicStatus",
      "Property identified — parcel geometry ready for screening"
    );


    setText(
      "buildingCodeJurisdiction",
      "Property identification complete. Municipal jurisdiction and regulatory screening are ready for the next workflow steps."
    );


    updateStatus(
      "Property identified successfully. Demonstration property record is ready for jurisdiction and flood hazard screening.",
      "success"
    );


    window.currentProperty = {

      searchValue:
        searchValue,

      isDemo:
        true,

      attributes: {

        OLDPIN:
          "556744376.0000000",

        PIN14:
          "556744376",

        OWNER:
          "Demonstration Property Record"

      },

      geometry:
        null

    };


    activateWorkflowThrough(
      2
    );


    console.log(
      "Demonstration property loaded:",
      window.currentProperty
    );

  }


  /* ===================================================
     SEARCH CABARRUS GIS
  =================================================== */

  async function searchCabarrusGIS(
    searchValue
  ) {


    const cleanValue =
      searchValue
        .trim()
        .replace(/,/g, "");


    const escapedValue =
      cleanValue.replace(
        /'/g,
        "''"
      );


    /* -----------------------------------------------
       SEARCH POSSIBLE PROPERTY IDENTIFIERS
    ----------------------------------------------- */

    const whereConditions = [

      "PIN14 = '" + escapedValue + "'",

      "PIN = '" + escapedValue + "'",

      "OLDPIN = '" + escapedValue + "'",

      "OLDPIN LIKE '" + escapedValue + "%'",

      "PARCEL = '" + escapedValue + "'",

      "PropertyReal_ID = '" + escapedValue + "'"

    ];


    for (
      let i = 0;
      i < whereConditions.length;
      i++
    ) {


      const whereClause =
        whereConditions[i];


      console.log(
        "Trying GIS query:",
        whereClause
      );


      try {


        const result =
          await queryGIS(
            whereClause
          );


        if (
          result &&
          result.features &&
          result.features.length > 0
        ) {


          console.log(
            "GIS match found using:",
            whereClause
          );


          return result.features[0];

        }


      } catch (error) {


        console.warn(
          "GIS query failed for:",
          whereClause,
          error
        );

      }

    }


    return null;

  }


  /* ===================================================
     EXECUTE GIS QUERY
  =================================================== */

  async function queryGIS(
    whereClause
  ) {


    const parameters =
      new URLSearchParams();


    parameters.set(
      "f",
      "json"
    );


    parameters.set(
      "where",
      whereClause
    );


    parameters.set(
      "outFields",
      "*"
    );


    parameters.set(
      "returnGeometry",
      "true"
    );


    parameters.set(
      "outSR",
      "4326"
    );


    parameters.set(
      "resultRecordCount",
      "10"
    );


    const requestURL =
      TAX_PARCELS_URL +
      "?" +
      parameters.toString();


    console.log(
      "GIS Request URL:",
      requestURL
    );


    const response =
      await fetch(
        requestURL
      );


    if (!response.ok) {

      throw new Error(
        "GIS server returned HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    if (data.error) {

      throw new Error(
        data.error.message ||
        "ArcGIS query failed."
      );

    }


    return data;

  }


  /* ===================================================
     DISPLAY LIVE PROPERTY
  =================================================== */

  function displayProperty(
    feature,
    searchValue
  ) {


    const attributes =
      feature.attributes || {};


    setText(
      "searchInput",
      searchValue
    );


    setText(
      "oldPinResult",
      getFirstValue(
        attributes.OLDPIN,
        attributes.OLD_PIN,
        attributes.LegacyPIN,
        "—"
      )
    );


    setText(
      "pin14Result",
      getFirstValue(
        attributes.PIN14,
        attributes.PIN,
        attributes.ParcelNumber,
        attributes.PARCEL,
        "—"
      )
    );


    const owner =
      combineOwnerName(
        attributes.AcctName1,
        attributes.AcctName2
      );


    setText(
      "ownerResult",
      owner ||
      getFirstValue(
        attributes.OWNER,
        attributes.OwnerName,
        "—"
      )
    );


    setText(
      "propertyStatus",
      "Property Identified"
    );


    setText(
      "municipalJurisdiction",
      "Ready for geographic jurisdiction screening"
    );


    setText(
      "geographicStatus",
      "Property geometry identified and ready for screening"
    );


    setText(
      "buildingCodeJurisdiction",
      "Property identified. Jurisdiction screening is ready for the next workflow step."
    );


    window.currentProperty = {

      searchValue:
        searchValue,

      isDemo:
        false,

      attributes:
        attributes,

      geometry:
        feature.geometry || null

    };


    console.log(
      "Live property stored:",
      window.currentProperty
    );

  }


  /* ===================================================
     COMBINE OWNER NAME
  =================================================== */

  function combineOwnerName(
    name1,
    name2
  ) {


    const names = [];


    if (
      name1 &&
      String(name1).trim()
    ) {

      names.push(
        String(name1).trim()
      );

    }


    if (
      name2 &&
      String(name2).trim()
    ) {

      names.push(
        String(name2).trim()
      );

    }


    return names.join(" ");

  }


  /* ===================================================
     GET FIRST AVAILABLE VALUE
  =================================================== */

  function getFirstValue() {


    for (
      let i = 0;
      i < arguments.length;
      i++
    ) {


      const value =
        arguments[i];


      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {

        return String(value);

      }

    }


    return "—";

  }


  /* ===================================================
     NORMALIZE VALUE
  =================================================== */

  function normalizeValue(
    value
  ) {

    return String(value)
      .trim()
      .replace(/,/g, "")
      .replace(/\.0+$/, "");

  }


  /* ===================================================
     UPDATE STATUS
  =================================================== */

  function updateStatus(
    message,
    statusType
  ) {


    if (statusMessage) {

      statusMessage.textContent =
        message;

    }


    if (statusDot) {


      statusDot.classList.remove(
        "success",
        "error",
        "loading"
      );


      if (statusType) {

        statusDot.classList.add(
          statusType
        );

      }

    }

  }


  /* ===================================================
     SET TEXT SAFELY
  =================================================== */

  function setText(
    elementId,
    value
  ) {


    const element =
      document.getElementById(
        elementId
      );


    if (element) {

      element.textContent =
        value;

    }

  }


  /* ===================================================
     SEARCH BUTTON STATE
  =================================================== */

  function setSearchButtonState(
    disabled,
    text
  ) {


    if (!searchButton) {

      return;

    }


    searchButton.disabled =
      disabled;


    searchButton.textContent =
      text;

  }


  /* ===================================================
     ACTIVATE WORKFLOW THROUGH STEP
  =================================================== */

  function activateWorkflowThrough(
    stepNumber
  ) {


    const steps =
      document.querySelectorAll(
        ".workflow-step"
      );


    steps.forEach(
      function (
        step,
        index
      ) {


        step.classList.remove(
          "active"
        );


        if (
          index < stepNumber
        ) {

          step.classList.add(
            "active"
          );

        }

      }
    );

  }


  /* ===================================================
     RESET RESULTS
  =================================================== */

  function resetResults() {


    const fields = [

      "oldPinResult",

      "pin14Result",

      "ownerResult",

      "municipalJurisdiction"

    ];


    fields.forEach(
      function (id) {

        setText(
          id,
          "—"
        );

      }
    );


    setText(
      "propertyStatus",
      "Searching..."
    );


    setText(
      "geographicStatus",
      "Waiting for property identification"
    );


    setText(
      "buildingCodeJurisdiction",
      "Municipal location has not yet been identified."
    );


    document
      .querySelectorAll(
        ".workflow-step"
      )
      .forEach(
        function (step) {

          step.classList.remove(
            "active"
          );

        }
      );


    window.currentProperty =
      null;

  }


  /* ===================================================
     READY MESSAGE
  =================================================== */

  console.log(
    "Cabarrus Flood Smart Intake is ready."
  );


});
