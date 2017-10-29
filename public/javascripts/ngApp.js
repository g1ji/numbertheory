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

                        console.log(success)
                        console.log(file)
                        scope.uploading = false;
                        scope.fileUploadPage = false;
                        scope.uploadedfileName = file.name;
                        scope.getTreeChartData();


                    }, function (error) {
                        console.log(error)
                        scope.uploading = false;
                    });
                }
            }])
        .controller('numThrCtrl', function ($scope, fileUpload) {
            var socket = io();

            $scope.fileNameChange = function (file) {

            };
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
                end: 4
            };
            $scope.getTreeChartData = function () {

                socket.emit('readFile', {
                    fileName: $scope.uploadedfileName,
                    fileNodes: $scope.fileNodes
                }
                );
            };
                socket.on('chartData', function (treeChartData) {
                    console.log(treeChartData)
                    if (!$scope.update_tree) {
                        $scope.drowTreeChart(treeChartData)
                    } else {
                        window.flare = treeChartData;
                        $scope.update_tree($scope.tree)
                    }

                })
            $scope.updateChart = function (update_tree, d) {
                $scope.fileNodes = {
                    start: 5,
                    end: 8
                };
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
// 1. Take a large size text file when streaming it through socket.
// 2. d3.js visualization should be self explanatory with x and y axis and beautified.
// 3. Line chart shluld be with respect to (string count in every 100 characters).
// 3. Inputs and visualization should be on a same page.
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
                if (root && root.children) {
                    root.children.forEach(collapse);
                }
                d3.select(self.frameElement).style("height", "800px");
                var update_tree = function (source) {
                    // Compute the new tree layout.
                    var nodes = tree.nodes(root).reverse(),
                            links = tree.links(nodes);
                    // Normalize for fixed-depth.
                    nodes.forEach(function (d) {
                        d.y = d.depth * 180;
                    });
                    // Update the nodes…
                    var node = svg.selectAll("g.node")
                            .data(nodes, function (d) {
                                return d.id || (d.id = ++i);
                            });
                    // Enter any new nodes at the parent's previous position.
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
                    // Transition nodes to their new position.
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
                    // Transition exiting nodes to the parent's new position.
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
                    // Update the links…
                    var link = svg.selectAll("path.link")
                            .data(links, function (d) {
                                return d.target.id;
                            });
                    // Enter any new links at the parent's previous position.
                    link.enter().insert("path", "g")
                            .attr("class", "link")
                            .attr("d", function (d) {
                                var o = {x: source.x0, y: source.y0};
                                return diagonal({source: o, target: o});
                            });
                    // Transition links to their new position.
                    link.transition()
                            .duration(duration)
                            .attr("d", diagonal);
                    // Transition exiting nodes to the parent's new position.
                    link.exit().transition()
                            .duration(duration)
                            .attr("d", function (d) {
                                var o = {x: source.x, y: source.y};
                                return diagonal({source: o, target: o});
                            })
                            .remove();
                    // Stash the old positions for transition.
                    nodes.forEach(function (d) {
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });
                }
                update_tree(root);
                window.update_tree = update_tree;
// Toggle children on click.
                function tree_node_click(d) {
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
//                        setTimeout(function () {
//                            window.flare.children.push({
//                                "name": "Info",
//                                "children": [
//                                    {"name": "Name:"},
//                                    {"name": "Line count:"},
//                                    {"name": "Group of 100 {count}: ", }
//                                ]
//                            });
//                            // d.parent.click()
//                            update_tree(d);
//                        }, 2000);
                    }
                    if (d.name == "Next >>") {
                        $scope.updateChart(update_tree, d)
                    }
                    update_tree(d);
                }
            }
        });