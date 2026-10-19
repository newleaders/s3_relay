(function() {
  var s3rUploadIndex = 0;

  var displayFailedUpload = function(progressColumn) {
    if (progressColumn) {
      progressColumn.text("File could not be uploaded");
    } else {
      alert("File could not be uploaded");
    }
  };

  var publishEvent = function(target, name, detail) {
    $(target).trigger(name, detail);
  };

  var saveUrl = function(container, uuid, filename, contentType, publicUrl, progressColumn, fileColumn) {
    var privateUrl = null;

    $.ajax({
      type: "POST",
      url: "/s3_relay/uploads",
      data: {
        parent_type: container.data("parentType"),
        parent_id: container.data("parentId"),
        association: container.data("association"),
        uuid: uuid,
        filename: filename,
        content_type: contentType,
        public_url: publicUrl
      },
      success: function(data, status, xhr) {
        privateUrl = data.private_url;
        if (privateUrl === null) {
          displayFailedUpload(progressColumn);
        } else {
          fileColumn.html("<a href='" + privateUrl + "' target='_blank'>" + filename + "</a>");

          var virtualAttr = container.data('parentType') + "[new_" + container.data('association') + "_uuids]";
          var hiddenField = "<input type='hidden' name='" + virtualAttr + "[]' value='" + uuid + "' />";
          container.append(hiddenField);
        }
        publishEvent(container, "upload:success", [uuid, filename, privateUrl]);
      },
      error: function(xhr) {
        console.log(xhr.responseText);
      }
    });

    return privateUrl;
  };

  var uploadFile = function(container, file) {
    var fileName = file.name;

    // Assign unique value to each request so Safari doesn't consolidate them
    s3rUploadIndex += 1;

    $.ajax({
      type: "GET",
      url: "/s3_relay/uploads/new?s3r_upload_index=" + s3rUploadIndex,
      success: function(data, status, xhr) {
        var formData = new FormData();
        xhr = new XMLHttpRequest();
        var endpoint = data.endpoint;
        var disposition = container.data("disposition");

        formData.append("AWSAccessKeyID", data.awsaccesskeyid);
        formData.append("x-amz-server-side-encryption", data.x_amz_server_side_encryption);
        formData.append("key", data.key);
        formData.append("success_action_status", data.success_action_status);
        formData.append("acl", data.acl);
        formData.append("policy", data.policy);
        formData.append("signature", data.signature);
        formData.append("content-type", file.type);
        formData.append("content-disposition", disposition + "; filename=\"" + fileName + "\"");
        formData.append("file", file);

        var uuid = data.uuid;

        var uploadList = $(".s3r-upload-list", container);
        uploadList.prepend("<tr id='" + uuid + "'><td><div class='s3r-file-url'>" + fileName + "</div></td><td class='s3r-progress'><div class='s3r-bar' style='display: none;'><div class='s3r-meter'></div></div></td></tr>");
        var fileColumn = $(".s3r-upload-list #" + uuid + " .s3r-file-url", container);
        var progressColumn = $(".s3r-upload-list #" + uuid + " .s3r-progress", container);
        var progressBar = $(".s3r-bar", progressColumn);
        var progressMeter = $(".s3r-meter", progressColumn);

        xhr.upload.addEventListener("progress", function(ev) {
          if (ev.loaded) {
            var percentage = ((ev.loaded / ev.total) * 100.0).toFixed(0);
            progressBar.show();
            progressMeter.css("width", percentage + "%");
          } else {
            progressColumn.text("Uploading..."); // IE can't get position
          }
        });

        xhr.onreadystatechange = function(ev) {
          if (xhr.readyState === 4) {
            progressColumn.text(""); // IE can't get position
            progressBar.remove();

            if (xhr.status === 201) {
              var contentType = file.type;
              var publicUrl = $("Location", xhr.responseXML).text();
              saveUrl(container, uuid, fileName, contentType, publicUrl, progressColumn, fileColumn);
            } else {
              displayFailedUpload(progressColumn);
              console.log($("Message", xhr.responseXML).text());
            }
          }
        };

        xhr.open("POST", endpoint, true);
        xhr.send(formData);
      },
      error: function(xhr) {
        displayFailedUpload();
        console.log(xhr.responseText);
      }
    });
  };

  var uploadFiles = function(container) {
    var fileInput = $("input.s3r-field", container);
    var files = fileInput.get(0).files;
    for (var i = 0; i < files.length; i++) {
      uploadFile(container, files[i]);
    }
    fileInput.val("");
  };

  jQuery(function() {
    $(document).on("change", ".s3r-field", function() {
      var $this = $(this);

      if (!!window.FormData) {
        uploadFiles($this.parent());
      } else {
        $this.hide();
        $this.parent().append("<p>Your browser can't handle file uploads, please switch to <a href='http://google.com/chrome'>Google Chrome</a>.</p>");
      }
    });
  });
})();
