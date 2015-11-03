export class MainCtrl {
    constructor($rootScope, utilService, $mdDialog, $http, authService) {
        this.$rootScope = $rootScope;
        this.utilService = utilService;
        this.$mdDialog = $mdDialog;
        this.$http = $http;
        this.authService = authService;

        this.init();
    }

    init() {
        this.authService.getAuth();


        this.loadTree();
    }

    loadTree() {
        this.$rootScope.api.getTree().then((data) => {
            this.$rootScope.$apply(() => {
                this.tree = data;
            });
        });
    }

    openMenu($mdOpenMenu, evt) {
        $mdOpenMenu(evt);
    }

    calcIndentation(depth) {
        return (depth - 2) * 40;
    }

    /**
     * Adds a new node as a rightmost child of the target node.
     */
    addChild(target, evt) {
        this.$mdDialog.show({
            controller: ["$scope", "$mdDialog",
                ($scope, $mdDialog) => {
                    $scope.cancel = () => {
                        $mdDialog.cancel();
                    };

                    $scope.enterEmail = () => {
                        if ($scope.email && $scope.email.indexOf("@thegcci.org") > 1) {
                            console.log("finding user");
                            this.findUserByEmail($scope.email);
                        }
                    };

                    $scope.save = () => {
                        $mdDialog.hide({
                            "title": $scope.title,
                            "email": $scope.email
                        });
                    };
                }
            ],
            templateUrl: 'assets/md-templates/node-editor.html',
            parent: angular.element(document.body),
            targetEvent: evt
        }).then((data) => {
            this.$rootScope.api.getChildren(target).then((children) => {
                // calculate new node's path
                let newNodeIndex = children.length > 0 ? this.getNodeIndex(children[children.length - 1]) + 1 : 1;
                let newNodePath = target.path + this.indexToPath(newNodeIndex);

                // insert new node
                this.$rootScope.ref.push({
                    "title": data.title,
                    "uid": data.email,
                    "path": newNodePath,
                    "depth": this.getDepth(newNodePath)
                }, (error) => {
                    if (error) {
                        throw error;
                    }
                    else {
                        this.loadTree();
                    }
                });
            });
        });
    }

    /**
     * Adds a new node as a sibling of the given target.
     * Available pos are: "left", "right".
     */
    addSibling(target, pos, evt) {
        this.$mdDialog.show({
            controller: ["$scope", "$mdDialog",
                ($scope, $mdDialog) => {
                    $scope.cancel = () => {
                        $mdDialog.cancel();
                    };

                    $scope.save = () => {
                        $mdDialog.hide({
                            "title": $scope.title,
                            "email": $scope.email
                        });
                    };
                }
            ],
            templateUrl: 'assets/md-templates/node-editor.html',
            parent: angular.element(document.body),
            targetEvent: evt
        }).then((data) => {
            this.$rootScope.api.getSiblings(target).then((siblings) => {
                let rightSiblings = [],
                    targetIndex = this.getNodeIndex(target);

                // get right siblings of the target.
                for (let n of siblings) {
                    if (this.getNodeIndex(n) > targetIndex) {
                        rightSiblings.push(n);
                    }
                }

                // insert new node
                let newNodePath = pos === "left" ? target.path : this.getPathByShiftingIndex(target, 1);
                this.$rootScope.ref.push({
                    "title": data.title,
                    "uid": data.email,
                    "path": newNodePath,
                    "depth": this.getDepth(newNodePath)
                });

                // includes target node into right siblings if pos === 'left'
                if (pos === "left") {
                    rightSiblings.splice(0, 0, target);
                }
                for (let n of rightSiblings) {
                    this.updatePath(n, this.getPathByShiftingIndex(n, 1));
                }
            });
        });
    }

    /**
     * Removes node and all of its descendants.
     */
    remove(node, evt) {
        this.$mdDialog.show(
            this.$mdDialog.confirm()
                .title("Confirm")
                .content("Deleting this node will result in deleting all of its descendants. Are you sure to continue?")
                .targetEvent(evt)
                .ok("Confirm")
                .cancel("Cancel")
        ).then(() => {
            this.$rootScope.api.getSiblings(node).then((siblings) => {
                let rightSiblings = [],
                    nodeIndex = this.getNodeIndex(node);

                // get right siblings of node
                for (let n of siblings) {
                    if (this.getNodeIndex(n) > nodeIndex) {
                        rightSiblings.push(n);
                    }
                }

                // remove node and all of its descendants
                this.$rootScope.api.getDescendants(node).then((descendants) => {
                    this.$rootScope.api.getNodeRef(node).remove();
                    for (let n of descendants) {
                        this.$rootScope.api.getNodeRef(n).remove();
                    }
                });

                // update path of right siblings
                for (let n of rightSiblings) {
                    this.updatePath(n, this.getPathByShiftingIndex(n, -1));
                }
            });
        });
    }

    /**
     * Moves given node and all of its descendants to a new position relative to the target.
     */
    move(node) {
        this.$rootScope.api.getDescendants(node).then((descendants) => {
            descendants.splice(0, 0, node);
            this.moveNodes = descendants;
        });
    }

    /**
     * The position of target node to move to.
     */
    moveTo(target, pos) {
        this.$rootScope.api.getDescendants(target).then((descendants) => {

        });
        if (pos === "child") {

        }
        else if (pos === "sibling:left" || pos === "sibling:right") {

        }
    }

    /**
     * Cancels move operation.
     */
    cancelMove() {
        this.moveNode = null;
    }

    /**
     * Updates path of node and all of its descendants.
     */
    updatePath(node, newPath) {
        // update descendants
        this.$rootScope.api.getDescendants(node).then((descendants) => {
            for (let n of descendants) {
                let dNewPath = newPath + n.path.substr(node.path.length);
                this.$rootScope.api.getNodeRef(n).update({
                    "path": dNewPath,
                    "depth": this.getDepth(dNewPath)
                })
            }
        });

        // update node
        this.$rootScope.api.getNodeRef(node).update({
            "path": newPath,
            "depth": this.getDepth(newPath)
        });
    }

    /**
     * Adds a node.
     */
    addNode(title, email1, email2, path, callback) {
        let user = [
            { "email": email1 },
            { "email": email2 }
        ];
        this.$rootScope.ref.push({
            "title": title,
            "uid": user,
            "path": path,
            "depth": this.getDepth(path)
        }, (error) => {
            if (error) {
                throw error;
            }
            else if (typeof callback === "function") {
                callback();
            }
        });
    }

    getNodeIndex(node) {
        return parseInt(node.path.substr(node.path.length - 4));
    }
    
    getPathByShiftingIndex(node, toShift) {
        return node.path.substr(0, node.path.length - 4) + this.indexToPath(this.getNodeIndex(node) + toShift);
    }

    getDepth(path) {
        return path.length / 4;
    }

    indexToPath(index) {
        return (10000 + index).toString().substr(1);
    }

    findUserByEmail(email) {
        let url = `https://www.googleapis.com/admin/directory/v1/users/${email}`;

        this.$http.get(url).then((data) => {
            console.log(data);
        });
    }
}

MainCtrl.$inject = ["$rootScope", "utilService", "$mdDialog", "$http", "authService"];