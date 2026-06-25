resource "aws_route53_record" "gitlab" {
  count   = var.gitlab_hosted_zone_id != "" ? 1 : 0
  zone_id = var.gitlab_hosted_zone_id
  name    = var.gitlab_domain
  type    = "A"

  alias {
    name                   = aws_lb.gitlab.dns_name
    zone_id                = aws_lb.gitlab.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "gitlab_registry" {
  count   = var.gitlab_hosted_zone_id != "" ? 1 : 0
  zone_id = var.gitlab_hosted_zone_id
  name    = "registry.${var.gitlab_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.gitlab.dns_name
    zone_id                = aws_lb.gitlab.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "gitlab_pages" {
  count   = var.gitlab_hosted_zone_id != "" ? 1 : 0
  zone_id = var.gitlab_hosted_zone_id
  name    = "pages.${var.gitlab_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.gitlab.dns_name
    zone_id                = aws_lb.gitlab.zone_id
    evaluate_target_health = true
  }
}
