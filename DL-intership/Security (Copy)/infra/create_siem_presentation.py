#!/usr/bin/env python3
import html
import os
import zipfile
from pathlib import Path


OUT = Path(__file__).resolve().parent / "aws-opensearch-siem-demo.pptx"

SLIDE_W = 13.333
SLIDE_H = 7.5
EMU = 914400


def emu(v):
    return int(v * EMU)


def esc(text):
    return html.escape(str(text), quote=True)


def text_box(x, y, w, h, text, font_size=24, color="263238", bold=False, align="l"):
    paragraphs = str(text).split("\n")
    p_xml = []
    for para in paragraphs:
        if not para:
            p_xml.append("<a:p/>")
            continue
        p_xml.append(
            f"""
            <a:p>
              <a:pPr algn="{align}"/>
              <a:r>
                <a:rPr lang="en-US" sz="{font_size * 100}" b="{1 if bold else 0}">
                  <a:solidFill><a:srgbClr val="{color}"/></a:solidFill>
                </a:rPr>
                <a:t>{esc(para)}</a:t>
              </a:r>
            </a:p>
            """
        )
    shape_id = text_box.next_id
    text_box.next_id += 1
    return f"""
    <p:sp>
      <p:nvSpPr><p:cNvPr id="{shape_id}" name="TextBox {shape_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t"/>
        <a:lstStyle/>
        {''.join(p_xml)}
      </p:txBody>
    </p:sp>
    """


text_box.next_id = 2


def rect(x, y, w, h, fill, line="FFFFFF", radius=False):
    shape = "roundRect" if radius else "rect"
    xml = f"""
    <p:sp>
      <p:nvSpPr><p:cNvPr id="{text_box.next_id}" name="Shape {text_box.next_id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
        <a:prstGeom prst="{shape}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
        <a:ln w="12700"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>
      </p:spPr>
    </p:sp>
    """
    text_box.next_id += 1
    return xml


def line(x1, y1, x2, y2, color="477A7B", width=2):
    return f"""
    <p:cxnSp>
      <p:nvCxnSpPr><p:cNvPr id="{text_box.next_id}" name="Line {text_box.next_id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(min(x1, x2))}" y="{emu(min(y1, y2))}"/><a:ext cx="{emu(abs(x2-x1))}" cy="{emu(abs(y2-y1))}"/></a:xfrm>
        <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
        <a:ln w="{width * 12700}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:tailEnd type="triangle"/></a:ln>
      </p:spPr>
    </p:cxnSp>
    """


def bullet_box(x, y, w, h, bullets, font_size=21, color="263238"):
    p_xml = []
    for bullet in bullets:
        p_xml.append(
            f"""
            <a:p>
              <a:pPr marL="285750" indent="-171450"><a:buChar char="•"/></a:pPr>
              <a:r><a:rPr lang="en-US" sz="{font_size * 100}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:rPr><a:t>{esc(bullet)}</a:t></a:r>
            </a:p>
            """
        )
    xml = f"""
    <p:sp>
      <p:nvSpPr><p:cNvPr id="{text_box.next_id}" name="Bullets {text_box.next_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" anchor="t"/>
        <a:lstStyle/>
        {''.join(p_xml)}
      </p:txBody>
    </p:sp>
    """
    text_box.next_id += 1
    return xml


def title_slide(title, subtitle):
    return [
        rect(0, 0, SLIDE_W, SLIDE_H, "102027", "102027"),
        rect(0, 6.75, SLIDE_W, 0.75, "2F7D79", "2F7D79"),
        text_box(0.7, 1.65, 11.8, 1.4, title, 42, "FFFFFF", True),
        text_box(0.75, 3.0, 10.8, 1.0, subtitle, 22, "D8E8E7"),
        text_box(0.75, 6.92, 8.5, 0.35, "AWS CloudTrail -> Firehose -> Lambda -> OpenSearch", 16, "FFFFFF"),
        text_box(10.4, 6.92, 2.1, 0.35, "May 2026", 16, "FFFFFF", False, "r"),
    ]


def slide_base(title, section=None):
    parts = [
        rect(0, 0, SLIDE_W, SLIDE_H, "F7FAFA", "F7FAFA"),
        rect(0, 0, SLIDE_W, 0.28, "2F7D79", "2F7D79"),
        text_box(0.55, 0.55, 11.9, 0.55, title, 28, "102027", True),
    ]
    if section:
        parts.append(text_box(10.4, 0.62, 2.3, 0.35, section, 12, "6B7C80", False, "r"))
    return parts


def card(x, y, w, h, title, body, fill="FFFFFF"):
    return [
        rect(x, y, w, h, fill, "D5E2E2", True),
        text_box(x + 0.25, y + 0.18, w - 0.5, 0.35, title, 17, "2F7D79", True),
        text_box(x + 0.25, y + 0.62, w - 0.5, h - 0.75, body, 15, "263238"),
    ]


def architecture_slide():
    parts = slide_base("Architecture: AWS SIEM Ingestion Pipeline", "Design")
    labels = [
        ("AWS Account\nActivity", 0.55),
        ("CloudTrail", 2.1),
        ("CloudWatch\nLogs", 3.65),
        ("Subscription\nFilter", 5.2),
        ("Kinesis\nFirehose", 6.75),
        ("Lambda\nTransformer", 8.3),
        ("OpenSearch\ncloudtrail-logs*", 9.85),
        ("Dashboards\nDiscover", 11.4),
    ]
    y = 2.25
    for label, x in labels:
        parts.append(rect(x, y, 1.25, 0.95, "FFFFFF", "8DB8B5", True))
        parts.append(text_box(x + 0.08, y + 0.18, 1.1, 0.5, label, 12, "102027", True, "ctr"))
    for i in range(len(labels) - 1):
        parts.append(line(labels[i][1] + 1.25, y + 0.48, labels[i + 1][1], y + 0.48))
    parts.extend(card(0.8, 4.15, 3.4, 1.6, "Private access pattern", "Browser -> SSH tunnel -> Bastion EC2 -> VPC-only OpenSearch Dashboards", "EEF7F6"))
    parts.extend(card(4.95, 4.15, 3.4, 1.6, "Security controls", "Private subnets, security groups, KMS encryption, OpenSearch fine-grained access control", "FFFFFF"))
    parts.extend(card(9.1, 4.15, 3.4, 1.6, "Reliability path", "Firehose backs up failed delivery records to S3 for troubleshooting and replay analysis", "FFFFFF"))
    return parts


def proof_slide():
    parts = slide_base("Evidence That The Pipeline Worked", "Validation")
    parts.extend(card(0.65, 1.4, 3.7, 1.5, "Ingestion", "CloudTrail logging was enabled and delivered events to CloudWatch Logs.", "FFFFFF"))
    parts.extend(card(4.8, 1.4, 3.7, 1.5, "Processing", "Firehose was ACTIVE. Lambda transformer logs showed DATA_MESSAGE records and result: Ok.", "FFFFFF"))
    parts.extend(card(8.95, 1.4, 3.7, 1.5, "Search", "OpenSearch cluster was green and Discover showed hits in cloudtrail-logs*.", "FFFFFF"))
    parts.append(text_box(0.85, 3.55, 11.7, 0.45, "Fields seen in OpenSearch Dashboards", 20, "102027", True))
    parts.append(bullet_box(1.0, 4.12, 11.5, 1.6, [
        "owner: 152617279670",
        "log_group: /aws/cloudtrail/organization",
        "log_stream: 152617279670_CloudTrail_us-east-1",
        "subscription_filters: development-cloudtrail-to-firehose",
        "event_names: GetBucketAcl, GenerateDataKey, DescribeMetricFilters, AssumeRole",
    ], 17))
    parts.append(rect(0.65, 6.45, 12.0, 0.45, "E7F3F2", "C4DEDC", True))
    parts.append(text_box(0.95, 6.53, 11.4, 0.25, "Conclusion: real CloudTrail events from the AWS account were transformed, indexed, and searchable.", 15, "2F4F4F", True, "ctr"))
    return parts


slides = [
    title_slide("AWS OpenSearch SIEM Proof of Concept", "A Terraform-built pipeline for collecting, transforming, indexing, and investigating AWS CloudTrail security events."),
    slide_base("Purpose And Outcome", "Overview")
    + [bullet_box(0.85, 1.55, 11.7, 3.1, [
        "Goal: build a SIEM-style AWS pipeline using OpenSearch as the searchable investigation layer.",
        "Scope: deploy the infrastructure, verify logs flow end-to-end, access Dashboards privately, then tear it down after practice.",
        "Outcome: CloudTrail events from the AWS account were delivered into OpenSearch and visible in Dashboards Discover.",
        "Positioning: this is a working SIEM foundation; detection rules, alerting, dashboards, and incident workflows are next.",
    ], 22)]
    + card(0.95, 5.2, 11.4, 0.9, "Demo thesis", "This was not only Terraform provisioning. It was an end-to-end security data pipeline with validation and operational teardown.", "EEF7F6"),
    architecture_slide(),
    slide_base("Terraform Components Built", "Implementation")
    + [bullet_box(0.85, 1.35, 5.8, 4.8, [
        "VPC with public and private subnets",
        "Security groups for private OpenSearch and bastion access",
        "Private OpenSearch domain for SIEM indexing",
        "KMS keys for logging and OpenSearch encryption",
        "CloudTrail trail and CloudWatch log group",
        "CloudWatch Logs subscription filter",
    ], 19)]
    + [bullet_box(7.0, 1.35, 5.7, 4.8, [
        "Kinesis Firehose delivery stream",
        "Lambda transformer for CloudTrail records",
        "S3 Firehose backup bucket for failed records",
        "OpenSearch role mapping for Firehose ingestion",
        "Index template and initial cloudtrail-logs index",
        "Temporary bastion path for Dashboards access",
    ], 19)],
    proof_slide(),
    slide_base("What The OpenSearch View Demonstrated", "Dashboard")
    + [bullet_box(0.85, 1.25, 11.7, 3.6, [
        "Discover showed the cloudtrail-logs* data view with time-based CloudTrail events.",
        "The owner field matched AWS account 152617279670.",
        "Events included AWS service activity such as KMS, S3, STS, CloudTrail, and OpenSearch-related actions.",
        "Searchable fields included event names, event sources, regions, usernames, identity types, source IPs, and error codes.",
    ], 22)]
    + card(1.0, 5.35, 5.4, 1.05, "SOC value", "Analysts can ask: who did what, from where, against which AWS service, and when?", "EEF7F6")
    + card(6.95, 5.35, 5.4, 1.05, "Engineering value", "Failures are diagnosable through Lambda logs, Firehose metrics, and S3 failed-record backup.", "FFFFFF"),
    slide_base("SIEM Capabilities: Current vs Enterprise", "Maturity")
    + card(0.75, 1.3, 5.8, 4.75, "Working now", "CloudTrail collection\nCloudWatch Logs ingestion\nFirehose delivery\nLambda transformation\nOpenSearch indexing\nDashboards investigation\nPrivate bastion/tunnel access", "EEF7F6")
    + card(6.8, 1.3, 5.8, 4.75, "Next enterprise layer", "Detection rules and alerts\nSOC dashboards\nGuardDuty/Security Hub ingestion\nVPC Flow Logs ingestion\nIncident workflow\nIndex lifecycle management\nLeast-privilege SOC roles", "FFFFFF"),
    slide_base("Troubleshooting Lessons", "Operations")
    + [bullet_box(0.85, 1.25, 11.8, 4.8, [
        "Private OpenSearch domains require internal network access: bastion, VPN, SSM tunnel, or similar access path.",
        "OpenSearch fine-grained access control must map the Firehose IAM role for ingestion.",
        "Firehose metrics and failed S3 backups are essential for debugging delivery/authentication failures.",
        "Lambda transformer logs are the fastest way to prove CloudWatch Logs records are being processed.",
        "Destroy operations can be delayed by service-managed ENIs, especially Lambda VPC ENIs.",
    ], 21)],
    slide_base("Teardown Result", "Cleanup")
    + [bullet_box(0.85, 1.25, 11.7, 3.4, [
        "Terraform destroy completed and the Terraform state became empty.",
        "OpenSearch, Firehose, Lambda, CloudTrail, bastion EC2, VPC, subnets, security groups, and S3 buckets were removed.",
        "Temporary bootstrap Lambda IAM role was removed.",
        "KMS keys moved to PendingDeletion, which is expected because AWS enforces a deletion waiting period.",
    ], 21)]
    + [rect(0.85, 5.45, 11.7, 0.7, "FCEFD7", "E4B96D", True)]
    + [text_box(1.1, 5.62, 11.2, 0.28, "Operational note: remove the local /etc/hosts OpenSearch entry after the demo environment is gone.", 15, "5A4200", True, "ctr")],
    slide_base("Recommended Next Steps", "Roadmap")
    + [bullet_box(0.85, 1.2, 11.7, 4.9, [
        "Add detection monitors: root usage, failed console logins, IAM policy changes, CloudTrail changes, public S3 changes.",
        "Ingest GuardDuty, Security Hub, and VPC Flow Logs for broader coverage.",
        "Build dashboards for authentication, IAM changes, source IP activity, and high-risk AWS API calls.",
        "Add SNS, Slack, or email alerting for detection rules.",
        "Move Terraform state to a remote backend with locking for team usage.",
        "Replace ad hoc bastion access with SSM Session Manager or VPN for a production pattern.",
    ], 20)],
    title_slide("Closing Message", "This proof of concept successfully collected real AWS CloudTrail events, transformed them, indexed them into OpenSearch, and made them searchable in Dashboards. The next step is turning the search foundation into a detection and alerting platform."),
]


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
{slide_overrides}
</Types>"""


def slide_xml(parts):
    text_box.next_id = 2
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    {''.join(parts)}
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>"""


def rels(entries):
    body = "\n".join([f'<Relationship Id="{i}" Type="{t}" Target="{target}"/>' for i, t, target in entries])
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{body}</Relationships>"""


def presentation_xml(n):
    ids = "\n".join([f'<p:sldId id="{256+i}" r:id="rId{i+1}"/>' for i in range(n)])
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{n+1}"/></p:sldMasterIdLst>
<p:sldIdLst>{ids}</p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000" type="wide"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>"""


THEME = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="SIEM Theme">
<a:themeElements>
<a:clrScheme name="SIEM"><a:dk1><a:srgbClr val="102027"/></a:dk1><a:lt1><a:srgbClr val="F7FAFA"/></a:lt1><a:dk2><a:srgbClr val="263238"/></a:dk2><a:lt2><a:srgbClr val="FFFFFF"/></a:lt2><a:accent1><a:srgbClr val="2F7D79"/></a:accent1><a:accent2><a:srgbClr val="8DB8B5"/></a:accent2><a:accent3><a:srgbClr val="E4B96D"/></a:accent3><a:accent4><a:srgbClr val="6B7C80"/></a:accent4><a:accent5><a:srgbClr val="C4DEDC"/></a:accent5><a:accent6><a:srgbClr val="FCEFD7"/></a:accent6><a:hlink><a:srgbClr val="2F7D79"/></a:hlink><a:folHlink><a:srgbClr val="6B7C80"/></a:folHlink></a:clrScheme>
<a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Default"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
</a:themeElements></a:theme>"""

SLIDE_MASTER = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>"""

SLIDE_LAYOUT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>"""


def main():
    slide_overrides = "\n".join(
        [f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(1, len(slides) + 1)]
    )
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES.format(slide_overrides=slide_overrides))
        z.writestr("_rels/.rels", rels([
            ("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument", "ppt/presentation.xml"),
            ("rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"),
            ("rId3", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties", "docProps/app.xml"),
        ]))
        pres_rels = [(f"rId{i}", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide", f"slides/slide{i}.xml") for i in range(1, len(slides) + 1)]
        pres_rels.append((f"rId{len(slides)+1}", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster", "slideMasters/slideMaster1.xml"))
        z.writestr("ppt/_rels/presentation.xml.rels", rels(pres_rels))
        z.writestr("ppt/presentation.xml", presentation_xml(len(slides)))
        z.writestr("ppt/theme/theme1.xml", THEME)
        z.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER)
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels([
            ("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout", "../slideLayouts/slideLayout1.xml"),
            ("rId2", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme", "../theme/theme1.xml"),
        ]))
        z.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT)
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", rels([
            ("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster", "../slideMasters/slideMaster1.xml"),
        ]))
        for i, parts in enumerate(slides, start=1):
            z.writestr(f"ppt/slides/slide{i}.xml", slide_xml(parts))
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", rels([
                ("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout", "../slideLayouts/slideLayout1.xml"),
            ]))
        z.writestr("docProps/core.xml", """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>AWS OpenSearch SIEM Proof of Concept</dc:title><dc:subject>Security telemetry pipeline demo</dc:subject><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy></cp:coreProperties>""")
        z.writestr("docProps/app.xml", f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>{len(slides)}</Slides></Properties>""")
    print(OUT)


if __name__ == "__main__":
    main()
