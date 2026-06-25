variable "bucket_name" {
default = "my-default-bucket-04-20"
}
variable "force_destroy" {
  default = true
}


variable "tags" {
  type    = map(string)
  default = {
    env = "dev"
    owner = "created by terrform"
  }
}


variable "bucket_policy" {
  type    = string
  default = ""
}

variable "logging" {
  type = object({
    target_bucket = string
    target_prefix = string
  })
  default = null
}




