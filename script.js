/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   APPLICATION JAVASCRIPT
===================================================== */


/* =====================================================
   PUBLIC GIS SERVICE ENDPOINTS
===================================================== */


/*
  Public Cabarrus County parcel service.

  This is the parcel service currently used by the
  application for property identification.
*/

const PARCEL_SERVICE_URL =
  "https://location.cabarruscounty.us/arcgisservices/rest/services/Parcels/MapServer/0/query";


/*
  Public Cabarrus County Municipal District service.

  Used to identify municipal jurisdiction.
*/

const MUNICIPAL_SERVICE_URL =
  "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/MunicipalDistrict/MapServer/0/query";



/* =====================================================
   APPLICATION ELEMENTS
===================================================== */

const pinInput =
  document.getElementById("pinInput");


const searchButton =
  document.getElementById("searchButton");


const statusMessage =
  document.getElementById("statusMessage");


const statusDot =
  document.getElementById("statusDot");



/* =====================================================
   SEARCH BUTTON
===================================================== */

searchButton.addEventListener(
  "click",
  searchProperty
);



/* =====================================================
   ENTER KEY SEARCH
===================================================== */

pinInput.addEventListener(
  "keydown",
  function (event) {

    if (event.key === "Enter") {

      searchProperty();

    }

  }
);



/* =====================================================
   MAIN PROPERTY SEARCH
===================================================== */

async function searchProperty() {


  const searchValue =
    pinInput.value.trim();


  /* ---------------------------------------------------
     VALIDATE INPUT
  --------------------------------------------------- */

  if (!searchValue) {

    updateStatus(
      "Please enter a Property PIN, Legacy PIN, Old PIN, or Parcel Number.",
      "error"
    );


    return;

  }


  /* ---------------------------------------------------
     RESET APPLICATION
  --------------------------------------------------- */

  resetResults();


  document.getElementById("searchInput").textContent =
    searchValue;


  updateStatus(
    "Searching Cabarrus County public GIS data...",
    "loading"
  );


  searchButton.disabled = true;


  searchButton.textContent =
    "Searching...";


  try {


    /* =================================================
       SEARCH PARCEL SERVICE
    ================================================= */

    const parcelResult =
      await findParcel(searchValue);


    /* -------------------------------------------------
       NO PROPERTY FOUND
    ------------------------------------------------- */

    if (!parcelResult) {

      updateStatus(
        "No matching property was found in the Cabarrus County public parcel data.",
        "error"
      );


      document.getElementById("propertyStatus").textContent =
        "Property Not Found";


      return;

    }


    /* =================================================
       PROPERTY FOUND
    ================================================= */

    const parcel =
      parcelResult.feature;


    const attributes =
      parcel.attributes || {};


    const geometry =
      parcel.geometry;


    const spatialReference =
      parcelResult.spatialReference;


    /* -------------------------------------------------
       UPDATE PROPERTY PROFILE
    ------------------------------------------------- */

    document.getElementById("oldPinResult").textContent =
      formatValue(
        getFirstValue(
          attributes,
          [
            "OLDPIN",
            "OLD_PIN",
            "OLDPIN_",
            "PIN"
          ]
        )
      );


    document.getElementById("pin14Result").textContent =
      formatValue(
        getFirstValue(
          attributes,
          [
            "PIN14",
            "PIN_14",
            "PIN"
          ]
        )
      );


    document.getElementById("ownerResult").textContent =
      formatValue(
        getFirstValue(
          attributes,
          [
            "OWNER",
            "OWNERNAME",
            "OWNER_NAME",
            "OwnerName"
          ]
        )
      );


    document.getElementById("propertyStatus").textContent =
      "Property Identified";


    /* -------------------------------------------------
       ACTIVATE WORKFLOW
    ------------------------------------------------- */

    activateWorkflowStep("step1");


    if (geometry) {

      activateWorkflowStep("step2");

    }


    /* -------------------------------------------------
       PROPERTY IDENTIFIED STATUS
    ------------------------------------------------- */

    updateStatus(
      "Property identified successfully. Parcel geometry is available and ready for jurisdiction screening.",
      "success"
    );


    /* =================================================
       STEP 3
       JURISDICTION IDENTIFICATION
    ================================================= */

    if (geometry) {

      await identifyJurisdiction(
        geometry,
        spatialReference
      );

    } else {

      document.getElementById(
        "municipalJurisdiction"
      ).textContent =
        "Parcel geometry unavailable";


      document.getElementById(
        "geographicStatus"
      ).textContent =
        "Unable to perform jurisdiction screening";


      document.getElementById(
        "buildingCodeJurisdiction"
      ).textContent =
        "Building code authority cannot be evaluated until parcel geometry is available.";

    }


  } catch (error) {


    console.error(
      "Property search error:",
      error
    );


    updateStatus(
      "The public GIS service could not be reached. Please try again.",
      "error"
    );


    document.getElementById("propertyStatus").textContent =
      "GIS Lookup Error";


  } finally {


    searchButton.disabled = false;


    searchButton.textContent =
      "🔎 Search GIS";

  }

}



/* =====================================================
   FIND PARCEL
===================================================== */

async function findParcel(searchValue) {


  /*
    The application attempts several possible searches.

    This allows users to search using:

    - Current PIN14
    - Legacy PIN / OLDPIN
    - PIN
    - Parcel Number
  */


  const searches = [

    {
      field: "PIN14",
      value: `'${escapeSql(searchValue)}'`
    },

    {
      field: "OLDPIN",
      value: escapeSql(searchValue)
    },

    {
      field: "PIN",
      value: `'${escapeSql(searchValue)}'`
    },

    {
      field: "PARCEL",
      value: `'${escapeSql(searchValue)}'`
    }

  ];


  for (const search of searches) {


    const whereClause =
      `${search.field} = ${search.value}`;


    try {


      const params =
        new URLSearchParams({

          f: "json",

          where: whereClause,

          outFields: "*",

          returnGeometry: "true"

        });


      const requestUrl =
        `${PARCEL_SERVICE_URL}?${params.toString()}`;


      const response =
        await fetch(requestUrl);


      if (!response.ok) {

        continue;

      }


      const data =
        await response.json();


      /*
        ArcGIS can return an error object.
      */

      if (data.error) {

        console.warn(
          "GIS service error:",
          data.error
        );


        continue;

      }


      if (
        data.features &&
        data.features.length > 0
      ) {

        return {

          feature:
            data.features[0],

          spatialReference:
            data.spatialReference || null

        };

      }


    } catch (error) {


      console.warn(
        `Search attempt failed for ${search.field}:`,
        error
      );

    }

  }


  /*
    If exact searches fail, try a broader search
    using LIKE for string fields.
  */

  return await findParcelBroadSearch(
    searchValue
  );

}



/* =====================================================
   BROAD PARCEL SEARCH
===================================================== */

async function findParcelBroadSearch(searchValue) {


  const stringFields = [

    "PIN14",

    "PIN",

    "PARCEL"

  ];


  for (const field of stringFields) {


    try {


      const whereClause =
        `${field} LIKE '%${escapeSql(searchValue)}%'`;


      const params =
        new URLSearchParams({

          f: "json",

          where: whereClause,

          outFields: "*",

          returnGeometry: "true",

          resultRecordCount: "10"

        });


      const response =
        await fetch(
          `${PARCEL_SERVICE_URL}?${params.toString()}`
        );


      if (!response.ok) {

        continue;

      }


      const data =
        await response.json();


      if (
        data.features &&
        data.features.length > 0
      ) {

        return {

          feature:
            data.features[0],

          spatialReference:
            data.spatialReference || null

        };

      }


    } catch (error) {


      console.warn(
        "Broad parcel search failed:",
        error
      );

    }

  }


  return null;

}



/* =====================================================
   JURISDICTION IDENTIFICATION
===================================================== */

async function identifyJurisdiction(
  parcelGeometry,
  spatialReference
) {


  /* ---------------------------------------------------
     UPDATE JURISDICTION STATUS
  --------------------------------------------------- */

  document.getElementById(
    "municipalJurisdiction"
  ).textContent =
    "Checking public GIS data...";


  document.getElementById(
    "geographicStatus"
  ).textContent =
    "Municipal boundary screening in progress";


  document.getElementById(
    "buildingCodeJurisdiction"
  ).textContent =
    "Municipal location is being identified. Building code authority is evaluated separately.";


  try {


    /* -------------------------------------------------
       DETERMINE SPATIAL REFERENCE
    ------------------------------------------------- */

    const wkid =
      getSpatialReferenceWkid(
        parcelGeometry,
        spatialReference
      );


    /*
      Add spatial reference information to the
      geometry being sent to the GIS service.
    */

    const geometry = {

      ...parcelGeometry,

      spatialReference: {
        wkid: wkid
      }

    };


    /* -------------------------------------------------
       BUILD GIS QUERY
    ------------------------------------------------- */

    const params =
      new URLSearchParams({

        f: "json",

        geometry:
          JSON.stringify(geometry),

        geometryType:
          "esriGeometryPolygon",

        inSR:
          String(wkid),

        spatialRel:
          "esriSpatialRelIntersects",

        outFields:
          "DISTRICT",

        returnGeometry:
          "false"

      });


    const requestUrl =
      `${MUNICIPAL_SERVICE_URL}?${params.toString()}`;


    const response =
      await fetch(requestUrl);


    if (!response.ok) {

      throw new Error(
        `Municipal GIS request failed: ${response.status}`
      );

    }


    const data =
      await response.json();


    console.log(
      "Municipal jurisdiction response:",
      data
    );


    if (data.error) {

      throw new Error(
        data.error.message ||
        "Municipal GIS returned an error."
      );

    }


    /* =================================================
       MUNICIPALITY FOUND
    ================================================= */

    if (
      data.features &&
      data.features.length > 0
    ) {


      const districts =
        [...new Set(

          data.features

            .map(
              feature =>
                feature.attributes?.DISTRICT
            )

            .filter(Boolean)

        )];


      if (districts.length === 1) {


        const district =
          districts[0];


        document.getElementById(
          "municipalJurisdiction"
        ).textContent =
          district;


        document.getElementById(
          "geographicStatus"
        ).textContent =
          "Parcel intersects the identified municipal jurisdiction";


        document.getElementById(
          "buildingCodeJurisdiction"
        ).textContent =
          "Municipal jurisdiction identified. Building code enforcement authority must be evaluated separately from municipal boundaries.";


        activateWorkflowStep("step3");


        return district;

      }


      /* ===============================================
         MULTIPLE JURISDICTIONS
      =============================================== */

      if (districts.length > 1) {


        document.getElementById(
          "municipalJurisdiction"
        ).textContent =
          districts.join(" / ");


        document.getElementById(
          "geographicStatus"
        ).textContent =
          "Parcel intersects multiple municipal jurisdictions. Manual review may be required.";


        document.getElementById(
          "buildingCodeJurisdiction"
        ).textContent =
          "Multiple jurisdiction boundaries intersect the parcel. Building code enforcement authority requires additional review.";


        activateWorkflowStep("step3");


        return districts;

      }

    }


    /* =================================================
       NO MUNICIPAL DISTRICT FOUND
    ================================================= */

    document.getElementById(
      "municipalJurisdiction"
    ).textContent =
      "Unincorporated Cabarrus County";


    document.getElementById(
      "geographicStatus"
    ).textContent =
      "No municipal district intersection was identified";


    document.getElementById(
      "buildingCodeJurisdiction"
    ).textContent =
      "Geographic location identified as outside the public municipal district layer. Building code enforcement authority will be evaluated separately.";


    activateWorkflowStep("step3");


    return "Unincorporated Cabarrus County";


  } catch (error) {


    console.error(
      "Jurisdiction identification error:",
      error
    );


    document.getElementById(
      "municipalJurisdiction"
    ).textContent =
      "GIS lookup unavailable";


    document.getElementById(
      "geographicStatus"
    ).textContent =
      "Unable to complete municipal boundary screening";


    document.getElementById(
      "buildingCodeJurisdiction"
    ).textContent =
      "Public GIS jurisdiction lookup could not be completed.";


    return null;

  }

}



/* =====================================================
   GET SPATIAL REFERENCE WKID
===================================================== */

function getSpatialReferenceWkid(
  geometry,
  featureSetSpatialReference
) {


  /*
    First check the geometry itself.
  */

  if (
    geometry?.spatialReference?.wkid
  ) {

    return geometry.spatialReference.wkid;

  }


  /*
    Then check the ArcGIS FeatureSet response.
  */

  if (
    featureSetSpatialReference?.wkid
  ) {

    return featureSetSpatialReference.wkid;

  }


  /*
    Current public Parcels service commonly
    returns Web Mercator geometry.
  */

  return 3857;

}



/* =====================================================
   GET FIRST AVAILABLE ATTRIBUTE VALUE
===================================================== */

function getFirstValue(
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


  return null;

}



/* =====================================================
   FORMAT VALUE
===================================================== */

function formatValue(value) {


  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "—";

  }


  return String(value);

}



/* =====================================================
   ESCAPE SQL VALUE
===================================================== */

function escapeSql(value) {


  return String(value)

    .replace(
      /'/g,
      "''"
    );

}



/* =====================================================
   ACTIVATE WORKFLOW STEP
===================================================== */

function activateWorkflowStep(stepId) {


  const step =
    document.getElementById(stepId);


  if (step) {

    step.classList.add("active");

  }

}



/* =====================================================
   UPDATE STATUS
===================================================== */

function updateStatus(
  message,
  statusType = ""
) {


  statusMessage.textContent =
    message;


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



/* =====================================================
   RESET RESULTS
===================================================== */

function resetResults() {


  /* ---------------------------------------------------
     PROPERTY PROFILE
  --------------------------------------------------- */

  document.getElementById(
    "searchInput"
  ).textContent =
    "—";


  document.getElementById(
    "oldPinResult"
  ).textContent =
    "—";


  document.getElementById(
    "pin14Result"
  ).textContent =
    "—";


  document.getElementById(
    "ownerResult"
  ).textContent =
    "—";


  document.getElementById(
    "propertyStatus"
  ).textContent =
    "Searching...";


  /* ---------------------------------------------------
     JURISDICTION PROFILE
  --------------------------------------------------- */

  document.getElementById(
    "municipalJurisdiction"
  ).textContent =
    "—";


  document.getElementById(
    "geographicStatus"
  ).textContent =
    "Waiting for property identification";


  document.getElementById(
    "buildingCodeJurisdiction"
  ).textContent =
    "Municipal location has not yet been identified.";


  /* ---------------------------------------------------
     WORKFLOW
  --------------------------------------------------- */

  document
    .querySelectorAll(".workflow-step")
    .forEach(step => {

      step.classList.remove("active");

    });

}
