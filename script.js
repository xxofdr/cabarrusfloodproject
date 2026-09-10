/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   LIVE PROPERTY SEARCH
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  /* ===================================================
     PUBLIC GIS ENDPOINT
  =================================================== */

  const TAX_PARCELS_URL =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/Tax_Parcels/MapServer/1/query";


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
     STARTUP CHECK
  =================================================== */

  console.log("Cabarrus Flood Smart Intake loaded.");

  if (!pinInput || !searchButton) {

    console.error(
      "Required page elements were not found."
    );

    return;

  }


  /* ===================================================
     SEARCH BUTTON
  =================================================== */

  searchButton.addEventListener(
    "click",
    searchProperty
  );


  /* ===================================================
     ENTER KEY
  =================================================== */

  pinInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        event.preventDefault();

        searchProperty();

      }

    }
  );


  /* ===================================================
     MAIN SEARCH FUNCTION
  =================================================== */

  async function searchProperty() {

    const searchValue =
      pinInput.value.trim();


    /* -----------------------------------------------
       VALIDATE INPUT
    ----------------------------------------------- */

    if (!searchValue) {

      updateStatus(
        "Please enter a Property PIN, Legacy PIN, or Parcel Number.",
        "error"
      );

      return;

    }


    /* -----------------------------------------------
       RESET DISPLAY
    ----------------------------------------------- */

    resetResults();


    setText(
      "searchInput",
      searchValue
    );


    setText(
      "propertyStatus",
      "Searching public GIS..."
    );


    updateStatus(
      "Searching Cabarrus County public parcel data...",
      "loading"
    );


    searchButton.disabled = true;

    searchButton.textContent =
      "Searching...";


    try {


      /* ===============================================
         SEARCH THE PARCEL LAYER
      =============================================== */

      const result =
        await searchParcel(searchValue);


      /* -----------------------------------------------
         NO RESULT
      ----------------------------------------------- */

      if (!result) {

        setText(
          "propertyStatus",
          "Property Not Found"
        );


        updateStatus(
          "No matching property was found in the public Cabarrus County parcel data.",
          "error"
        );


        return;

      }


      /* ===============================================
         PROPERTY FOUND
      =============================================== */

      const attributes =
        result.attributes || {};


      /* -----------------------------------------------
         POPULATE PROPERTY PROFILE
      ----------------------------------------------- */

      setText(
        "oldPinResult",
        getValue(
          attributes,
          [
            "OLDPIN",
            "OldPIN"
          ]
        )
      );


      setText(
        "pin14Result",
        getValue(
          attributes,
          [
            "PIN14"
          ]
        )
      );


      setText(
        "ownerResult",
        getValue(
          attributes,
          [
            "OWNER",
            "AcctName1",
            "OWNERNAME",
            "OwnerName"
          ]
        )
      );


      setText(
        "propertyStatus",
        "Property Identified"
      );


      /* -----------------------------------------------
         ACTIVATE WORKFLOW
      ----------------------------------------------- */

      activateStep("step1");


      if (result.geometry) {

        activateStep("step2");

      }


      /* -----------------------------------------------
         SUCCESS MESSAGE
      ----------------------------------------------- */

      updateStatus(
        "Property identified successfully using Cabarrus County public GIS data.",
        "success"
      );


      /* -----------------------------------------------
         LOG RESULT FOR DEVELOPMENT
      ----------------------------------------------- */

      console.log(
        "Property result:",
        result
      );


      console.log(
        "Property attributes:",
        attributes
      );


      console.log(
        "Parcel geometry:",
        result.geometry
      );


      /* ===============================================
         TEMPORARY JURISDICTION MESSAGE
      =============================================== */

      if (result.geometry) {

        setText(
          "municipalJurisdiction",
          "Parcel geometry retrieved"
        );


        setText(
          "geographicStatus",
          "Ready for jurisdiction screening"
        );


        setText(
          "buildingCodeJurisdiction",
          "Municipal and building code authority screening will be added next."
        );

      }


    } catch (error) {


      console.error(
        "GIS Search Error:",
        error
      );


      setText(
        "propertyStatus",
        "GIS Search Error"
      );


      updateStatus(
        "Unable to complete the public GIS search. See the browser console for details.",
        "error"
      );


    } finally {


      searchButton.disabled = false;

      searchButton.textContent =
        "🔎 Search GIS";

    }

  }


  /* ===================================================
     SEARCH PARCEL FUNCTION
  =================================================== */

  async function searchParcel(searchValue) {


    /*
      We will try several possible identifiers.

      The public Tax Parcels layer includes
      PIN14 and OLDPIN fields.
    */

    const searches = [

      {
        field: "PIN14",
        where:
          `PIN14 = '${escapeSql(searchValue)}'`
      },

      {
        field: "OLDPIN",
        where:
          `OLDPIN = '${escapeSql(searchValue)}'`
      },

      {
        field: "PIN14",
        where:
          `PIN14 LIKE '%${escapeSql(searchValue)}%'`
      }

    ];


    for (const search of searches) {


      console.log(
        "Trying GIS search:",
        search.where
      );


      const params =
        new URLSearchParams({

          f: "json",

          where:
            search.where,

          outFields:
            "*",

          returnGeometry:
            "true",

          resultRecordCount:
            "10"

        });


      const url =
        `${TAX_PARCELS_URL}?${params.toString()}`;


      const response =
        await fetch(url);


      if (!response.ok) {

        console.warn(
          "GIS request failed:",
          response.status
        );

        continue;

      }


      const data =
        await response.json();


      console.log(
        "GIS response:",
        data
      );


      if (data.error) {

        console.warn(
          "GIS returned an error:",
          data.error
        );

        continue;

      }


      if (
        data.features &&
        data.features.length > 0
      ) {

        return data.features[0];

      }

    }


    return null;

  }


  /* ===================================================
     GET ATTRIBUTE VALUE
  =================================================== */

  function getValue(
    attributes,
    fieldNames
  ) {

    for (const field of fieldNames) {

      const value =
        attributes[field];


      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        return value;

      }

    }


    return "—";

  }


  /* ===================================================
     SET TEXT SAFELY
  =================================================== */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {

      element.textContent =
        value ?? "—";

    }

  }


  /* ===================================================
     ESCAPE SQL
  =================================================== */

  function escapeSql(value) {

    return String(value)
      .replace(/'/g, "''");

  }


  /* ===================================================
     UPDATE STATUS
  =================================================== */

  function updateStatus(
    message,
    type
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


      if (type) {

        statusDot.classList.add(type);

      }

    }

  }


  /* ===================================================
     ACTIVATE WORKFLOW STEP
  =================================================== */

  function activateStep(stepId) {

    const step =
      document.getElementById(stepId);


    if (step) {

      step.classList.add("active");

    }

  }


  /* ===================================================
     RESET RESULTS
  =================================================== */

  function resetResults() {


    const fields = [

      "searchInput",
      "oldPinResult",
      "pin14Result",
      "ownerResult",
      "municipalJurisdiction"

    ];


    fields.forEach(function (id) {

      setText(id, "—");

    });


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
      .querySelectorAll(".workflow-step")
      .forEach(function (step) {

        step.classList.remove("active");

      });

  }


});
