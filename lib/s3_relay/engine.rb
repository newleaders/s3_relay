module S3Relay
  class Engine < ::Rails::Engine
    isolate_namespace S3Relay

    # Rails 7 forbids autoloading while initializers run, so add the helper in
    # to_prepare rather than from an on_load hook that fires during boot.
    config.to_prepare do
      ActionController::Base.helper S3Relay::UploadsHelper
    end
  end
end

require "s3_relay/base"
require "s3_relay/model"
require "s3_relay/private_url"
require "s3_relay/upload_presigner"

ActiveSupport.on_load(:active_record) { extend S3Relay::Model }
