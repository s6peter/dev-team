resource "aws_vpc" "this" {
  cidr_block           = var.vpc.cidr_block
  enable_dns_hostnames = var.vpc.enable_dns_hostnames
  enable_dns_support   = var.vpc.enable_dns_support

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-vpc" }
  )
}

resource "aws_subnet" "public" {
  count                   = length(var.vpc.public_subnets)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.vpc.public_subnets[count.index].cidr_block
  availability_zone       = var.vpc.public_subnets[count.index].az
  map_public_ip_on_launch = true

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-public-${count.index + 1}" }
  )
}

resource "aws_subnet" "private" {
  count             = length(var.vpc.private_subnets)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.vpc.private_subnets[count.index].cidr_block
  availability_zone = var.vpc.private_subnets[count.index].az

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-private-${count.index + 1}" }
  )
}

resource "aws_internet_gateway" "this" {
  count  = length(var.vpc.public_subnets) > 0 ? 1 : 0
  vpc_id = aws_vpc.this.id

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-igw" }
  )
}

resource "aws_route_table" "public" {
  count  = length(var.vpc.public_subnets) > 0 ? 1 : 0
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this[0].id
  }

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-public-rt" }
  )
}

resource "aws_route_table_association" "public" {
  count          = length(var.vpc.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_eip" "nat" {
  count  = var.vpc.enable_nat_gateway ? length(var.vpc.public_subnets) : 0
  domain = "vpc"

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-eip-${count.index + 1}" }
  )

  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count         = var.vpc.enable_nat_gateway ? length(var.vpc.public_subnets) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-nat-${count.index + 1}" }
  )

  depends_on = [aws_internet_gateway.this]
}

resource "aws_route_table" "private" {
  count  = var.vpc.enable_nat_gateway ? length(var.vpc.private_subnets) : 0
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index % length(aws_nat_gateway.this)].id
  }

  tags = merge(
    var.vpc.tags,
    { Name = "${var.vpc.name_prefix}-private-rt-${count.index + 1}" }
  )
}

resource "aws_route_table_association" "private" {
  count          = var.vpc.enable_nat_gateway ? length(var.vpc.private_subnets) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index % length(aws_route_table.private)].id
}
