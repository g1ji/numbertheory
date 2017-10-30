angular.module('numThrApp', [])
        .directive('fileModel', ['$parse', function ($parse) {
                return {
                    restrict: 'A',
                    link: function (scope, element, attrs) {
                        var model = $parse(attrs.fileModel);
                        var modelSetter = model.assign;
                        element.bind('change', function () {
                            scope.$apply(function () {
                                modelSetter(scope, element[0].files[0]);
                            });
                        });
                    }
                };
            }])
        .service('fileUpload', ['$http', function ($http) {
                this.uploadFileToUrl = function (file, uploadUrl, scope) {
                    var fd = new FormData();
                    fd.append('file', file);

                    $http.post(uploadUrl, fd, {
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                    }).then(function (success) {
                        scope.uploading = false;
                        scope.fileUploadPage = false;
                        scope.uploadedfileName = file.name;
                        scope.getTreeChartData();
                    }, function (error) {
                        console.log(error);
                        scope.uploading = false;
                    });
                };
            }])
        .controller('numThrCtrl', function ($scope, fileUpload) {
            var socket = io();
            $scope.openUplodedFile = function (file) {
                window.open('/uploads/' + $scope.uploadedfileName, '_blank');
            };
            $scope.uploadFile = function () {
                $scope.uploading = true;
                var file = $scope.myFile;
                if (file.type !== 'text/plain') {
                    alert("invalid file !");
                    return true;
                }
                var uploadUrl = "/fileUpload";
                fileUpload.uploadFileToUrl(file, uploadUrl, $scope);
            };
            $scope.fileNodes = {
                start: 0,
                end: 1
            };
            $scope.getTreeChartData = function () {
                socket.emit('readFile', {
                    fileName: $scope.uploadedfileName,
                    fileNodes: $scope.fileNodes
                });
            };
            socket.on('chartData', function (treeChartData) {
                console.log(treeChartData)
                if (!$scope.update_tree) {
                    $scope.drowTreeChart(treeChartData)
                } else {
                    window.flare.children = treeChartData.children;
                    $scope.update_tree($scope.tree)
                }

            });
            $scope.updateChart = function (update_tree, d) {
                socket.emit('readFile', {
                    fileName: $scope.uploadedfileName,
                    fileNodes: $scope.fileNodes
                });
                $scope.update_tree = update_tree;
                $scope.tree = d;

            }
            $scope.drowTreeChart = function (treeChartData) {
                var margin = {top: 20, right: 120, bottom: 20, left: 120},
                        width = $(document).width() - margin.right - margin.left - 100,
                        height = $(document).height() - margin.top - margin.bottom - 100;
                var i = 0,
                        duration = 750,
                        root;
                var tree = d3.layout.tree()
                        .size([height, width]);
                var diagonal = d3.svg.diagonal()
                        .projection(function (d) {
                            return [d.y, d.x];
                        });
                var svg = d3.select("#svg-chart").append("svg")
                        .attr("width", width + margin.right + margin.left)
                        .attr("height", height + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                window.flare = treeChartData;
                root = window.flare;
                root.x0 = height / 2;
                root.y0 = 0;
                function collapse(d) {
                    if (d.children) {
                        d._children = d.children;
                        d._children.forEach(collapse);
                        d.children = null;
                    }
                }
                d3.select(self.frameElement).style("height", "800px");
                var update_tree = function (source) {
                    var nodes = tree.nodes(root).reverse(),
                            links = tree.links(nodes);
                    nodes.forEach(function (d) {
                        d.y = d.depth * 180;
                    });
                    var node = svg.selectAll("g.node")
                            .data(nodes, function (d) {
                                return d.id || (d.id = ++i);
                            });
                    var nodeEnter = node.enter().append("g")
                            .attr("class", "node")
                            .attr("transform", function (d) {
                                return "translate(" + source.y0 + "," + source.x0 + ")";
                            })
                            .on("click", tree_node_click);
                    nodeEnter.append("circle")
                            .attr("r", 1e-6)
                            .style("fill", function (d) {
                                return d._children ? "lightsteelblue" : "#fff";
                            });
                    nodeEnter.append("text")
                            .attr("x", function (d) {
                                return d.children || d._children ? -10 : 10;
                            })
                            .attr("dy", ".35em")
                            .attr("text-anchor", function (d) {
                                return d.children || d._children ? "end" : "start";
                            })
                            .text(function (d) {
                                return d.name;
                            })
                            .style("fill-opacity", 1e-6);
                    var nodeUpdate = node.transition()
                            .duration(duration)
                            .attr("transform", function (d) {
                                return "translate(" + d.y + "," + d.x + ")";
                            });
                    nodeUpdate.select("circle")
                            .attr("r", 4.5)
                            .style("fill", function (d) {
                                return d._children ? "lightsteelblue" : "#fff";
                            });
                    nodeUpdate.select("text")
                            .style("fill-opacity", 1);
                    var nodeExit = node.exit().transition()
                            .duration(duration)
                            .attr("transform", function (d) {
                                return "translate(" + source.y + "," + source.x + ")";
                            })
                            .remove();
                    nodeExit.select("circle")
                            .attr("r", 1e-6);
                    nodeExit.select("text")
                            .style("fill-opacity", 1e-6);
                    var link = svg.selectAll("path.link")
                            .data(links, function (d) {
                                return d.target.id;
                            });
                    link.enter().insert("path", "g")
                            .attr("class", "link")
                            .attr("d", function (d) {
                                var o = {x: source.x0, y: source.y0};
                                return diagonal({source: o, target: o});
                            });
                    link.transition()
                            .duration(duration)
                            .attr("d", diagonal);
                    link.exit().transition()
                            .duration(duration)
                            .attr("d", function (d) {
                                var o = {x: source.x, y: source.y};
                                return diagonal({source: o, target: o});
                            })
                            .remove();
                    nodes.forEach(function (d) {
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });
                };
                update_tree(root);
                window.update_tree = update_tree;
                function tree_node_click(d) {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    if (d.name === "Next >>") {
                        $scope.fileNodes = {
                            start: $scope.fileNodes.start + 2,
                            end: $scope.fileNodes.end + 2
                        };
                        $scope.updateChart(update_tree, d);
                    }
                    if (d.name === "Previous <<") {
                        $scope.fileNodes = {
                            start: $scope.fileNodes.start - 2,
                            end: $scope.fileNodes.end - 2
                        };
                        $scope.updateChart(update_tree, d);
                    }
                    update_tree(d);
                }
            };
        });