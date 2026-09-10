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

     This PIN is automatically placed in the search box
     when the application loads if the box is empty.

     Search Input: 556744376
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
      "ERROR: #pinInput was not found in index.html."
    );

  }

  if (!searchButton) {

    console.error(
      "ERROR: #searchButton was not found in index.html."
    );

  }


  /* ===================================================
     LOAD TODAY'S TEST PIN
  =================================================== */

  if (pinInput) {

    if (!pinInput.value.trim()) {

      pinInput.value =
        TODAY_TEST_PIN;

    }

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

    console.log(
      "Property search started."
    );


    /* -----------------------------------------------
       GET SEARCH VALUE
    ----------------------------------------------- */

    if (!pinInput) {

      console.error(
        "Cannot search because pinInput does not exist."
      );

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
      "Searching Cabarrus County GIS..."
    );


    updateStatus(
      "Searching Cabarrus County public parcel data...",
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
         SEARCH CABARRUS GIS
      =============================================== */

      const property =
        await searchCabarrusGIS(
          searchValue
        );


      /* -----------------------------------------------
         PROPERTY NOT FOUND
      ----------------------------------------------- */

      if (!property) {

        console.warn(
          "No property was found."
        );


        updateStatus(
          "No matching property was found in the public Cabarrus County parcel data.",
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

      console.log(
        "Property found:",
        property
      );


      displayProperty(
        property,
        searchValue
      );


      updateStatus(
        "Property identified successfully. Parcel geometry is available and ready for the next screening step.",
        "success"
      );


      setText(
        "propertyStatus",
        "Property Identified"
      );


      setText(
        "geographicStatus",
        "Property identified — ready for jurisdiction and flood screening"
      );


      activateWorkflowStep(
        1
      );


    } catch (error) {


      console.error(
        "PROPERTY SEARCH ERROR:",
        error
      );


      updateStatus(
        "Unable to complete the Cabarrus GIS search. Please try again.",
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
     SEARCH CABARRUS GIS

     Searches multiple possible fields because users may
     enter:

     - Current PIN
     - PIN14
     - Legacy PIN
     - Old PIN
     - Parcel Number
     - Property Real ID
  =================================================== */

  async function searchCabarrusGIS(
    searchValue
  ) {


    /* -----------------------------------------------
       CLEAN INPUT
    ----------------------------------------------- */

    const cleanValue =
      searchValue
        .trim()
        .replace(/,/g, "");


    /* -----------------------------------------------
       ESCAPE SINGLE QUOTES
    ----------------------------------------------- */

    const escapedValue =
      cleanValue.replace(
        /'/g,
        "''"
      );


    /* -----------------------------------------------
       SEARCH CONDITIONS

       IMPORTANT:

       OLDPIN is searched both exactly and as a prefix.

       Example:

       User enters:
       556744376

       GIS may store:
       556744376.0000000
    ----------------------------------------------- */

    const whereConditions = [

      "PIN14 = '" + escapedValue + "'",

      "PIN = '" + escapedValue + "'",

      "OLDPIN = '" + escapedValue + "'",

      "OLDPIN LIKE '" + escapedValue + "%'",

      "PARCEL = '" + escapedValue + "'",

      "PropertyReal_ID = '" + escapedValue + "'"

    ];


    /* -----------------------------------------------
       SEARCH EACH FIELD
    ----------------------------------------------- */

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

    }


    /* -----------------------------------------------
       NO MATCH
    ----------------------------------------------- */

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
      [
        "PIN14",
        "PIN",
        "OLDPIN",
        "PARCEL",
        "PropertyReal_ID",
        "AcctName1",
        "AcctName2",
        "LegalDesc",
        "MailAddr1",
        "MailCity",
        "MailState",
        "MailZipCode"
      ].join(",")
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


    /* -----------------------------------------------
       ARCGIS ERROR CHECK
    ----------------------------------------------- */

    if (data.error) {

      console.error(
        "ArcGIS Error:",
        data.error
      );


      throw new Error(
        data.error.message ||
        "ArcGIS query failed."
      );

    }


    return data;

  }


  /* ===================================================
     DISPLAY PROPERTY
  =================================================== */

  function displayProperty(
    feature,
    searchValue
  ) {


    const attributes =
      feature.attributes || {};


    /* -----------------------------------------------
       PROPERTY PROFILE
    ----------------------------------------------- */

    setText(
      "searchInput",
      searchValue
    );


    setText(
      "oldPinResult",
      getFirstValue(
        attributes.OLDPIN,
        "—"
      )
    );


    setText(
      "pin14Result",
      getFirstValue(
        attributes.PIN14,
        attributes.PIN,
        "—"
      )
    );


    /* -----------------------------------------------
       OWNER
    ----------------------------------------------- */

    const owner =
      combineOwnerName(
        attributes.AcctName1,
        attributes.AcctName2
      );


    setText(
      "ownerResult",
      owner || "—"
    );


    /* -----------------------------------------------
       PROPERTY STATUS
    ----------------------------------------------- */

    setText(
      "propertyStatus",
      "Property Identified"
    );


    /* -----------------------------------------------
       STORE PROPERTY DATA

       This makes the geometry available for future:

       - Floodplain screening
       - Jurisdiction determination
       - Spatial intersection
       - FEMA/NFHL screening
    ----------------------------------------------- */

    window.currentProperty = {

      searchValue:
        searchValue,

      attributes:
        attributes,

      geometry:
        feature.geometry || null

    };


    console.log(
      "Current property stored:",
      window.currentProperty
    );


    /* -----------------------------------------------
       UPDATE OPTIONAL FIELDS
    ----------------------------------------------- */

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
     UPDATE STATUS MESSAGE
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
     ACTIVATE WORKFLOW STEP
  =================================================== */

  function activateWorkflowStep(
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
          index === stepNumber - 1
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


        const element =
          document.getElementById(id);


        if (element) {

          element.textContent =
            "—";

        }

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
