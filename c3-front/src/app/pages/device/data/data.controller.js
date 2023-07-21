(function() {
    'use strict';

    angular
        .module('openc3')
        .controller('DeviceDataController', DeviceDataController)
        .filter('cut61', function () {
            return function (text) {
                if( text.length > 64 )
                {
                    return text.substr(0, 61) + "..."
                }
                return text;

            }
        });

    function DeviceDataController($state, $http, $scope, $injector, ngTableParams, $uibModal, treeService) {
        var vm = this;
        var toastr = toastr || $injector.get('toastr');

        treeService.sync.then(function(){      // when the tree was success.
            vm.nodeStr = treeService.selectname();  // get tree name
        });

        vm.showfilter = 0;

        vm.chshowfilter = function(stat){
            vm.showfilter = stat;
            vm.grepfilter();
        }

        vm.treeid  = $state.params.treeid;
        vm.type    = $state.params.type;
        vm.subtype = $state.params.subtype;
        vm.grepdata = {pageSize:200};
        vm.selectedtimemachine = $state.params.timemachine;
        vm.timemachine = [];
        vm.downloadTitle = [];
        vm.downloadData = [];

        vm.filter = [];
        vm.filtergrep = [];
        vm.filterdata = {};

        vm.checkDataList = [];
        vm.checkboxes = {
          checked: false,
          items: {},
        };

        vm.tablePageSizeOption = [
          {
            label: '全部页长',
            value: ''
          },
          {
            value: 200,
            label: '200'
          }
        ]
        vm.tablePageSize = 200

        vm.pageSizeOption = [20, 30, 50, 100, 200];

        vm.grepdata._search_= sessionStorage.getItem('globalSearch')
        sessionStorage.removeItem('globalSearch')

        vm.grepfilter = function(){
            if( vm.showfilter )
            {
                vm.filtergrep = vm.filter;
            }
            else
            {
                vm.filtergrep = [];
                angular.forEach(vm.filter, function (value) {
                    if( vm.filtergrep.length < 6 )
                    {
                        vm.filtergrep.push(value)
                    }
                });
            }
        }

        vm.pointout = '';
        vm.reload = function () {
            vm.loadover = false;
            const grepDataJSON = JSON.parse(JSON.stringify(vm.grepdata));
            const newGrepdata = {};
            angular.forEach(grepDataJSON, function (value, key) {
              if (value !== '') {
                newGrepdata[key] = value
              }
            });
            $http.post('/api/agent/device/data/' + vm.type + '/' + vm.subtype + '/' + vm.treeid, { "grepdata": newGrepdata, "timemachine": vm.selectedtimemachine, "toxlsx": 1 } ).success(function(data){
                if (data.stat){
                    vm.downloadTitle = data.toxlsxtitle
                    vm.downloadData = data.data
                    vm.checkDataList = data.data
                    vm.dataTable = new ngTableParams({count:25}, {counts:vm.pageSizeOption,data:data.data});
                    vm.filter = data.filter;
                    angular.forEach(data.filterdata, function (value, key) {
                      value.unshift({name: '', count: key})
                      if (!vm.grepdata[key]) {
                        vm.grepdata[key] = ''
                      }
                    });
                    vm.filterdata = data.filterdata;
                    if( data.pointout == undefined || data.pointout == '' )
                    {
                        vm.pointout = '';
                    }
                    else
                    {
                        vm.pointout = data.pointout;
                    }
                    vm.grepfilter();
                    vm.loadover = true;
                }else {
                    swal({ title:'获取数据失败', text: data.info, type:'error' });
                }
            });
        };
        vm.reload();

        vm.pageSizeChange = function (value) {
          vm.grepdata['pageSize'] = value
          vm.tablePageSize = value
          vm.reload()
        }

        sessionStorage.removeItem('globalSearch');

        vm.reloadtimemachine = function () {
            $http.get('/api/agent/device/timemachine' ).success(function(data){
                if (data.stat){
                    vm.timemachine = data.data;
                }else {
                    swal({ title:'获取时间机器列表失败', text: data.info, type:'error' });
                }
            });
        };
        vm.reloadtimemachine();

        vm.reset = function () {
            vm.grepdata = {pageSize:200};
            vm.reload();
        };

        vm.showdetail = function (uuid, type, subtype ) {
            $uibModal.open({
                templateUrl: 'app/pages/device/data/detail.html',
                controller: 'DeviceDataDetailController',
                controllerAs: 'devicedatadetail',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                    getGroup: function () {return vm.getGroupInfo},
                    uuid: function () {return uuid},
                    type: function () {return type},
                    subtype: function () {return subtype},
                    treeid: function () {return vm.treeid},
                    name: function () {return name},
                    homereload: function () {return vm.reload},
                    selectedtimemachine: function () {return vm.selectedtimemachine},
                }
            });
        };

        vm.show = function ( uuid, type, subtype, config ) {
            if( config['type'] == 'blank' )
            {
                $http.post('/api/agent/device/detail/' + type+ '/' + subtype + '/' + vm.treeid +'/' + uuid + '?timemachine=' + vm.selectedtimemachine , { 'exturl': config['url'] }).success(function(data){
                    if (data.stat){
                        window.open(data.data, '_blank')
                    }else {
                        swal({ title:'获取URL地址失败', text: data.info, type:'error' });
                    }
                });
            }
            else if (config['type'] === 'modal') {
              $uibModal.open({
                templateUrl: 'app/pages/device/data/dialog/resourceDetail/resourceDetail.html',
                controller: 'ResourceDetailController',
                controllerAs: 'resourceDetail',
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                bindToController: true,
                resolve: {
                  config: function () {return config},
                  uuid: function () {return uuid},
                  type: function () {return type},
                  subtype: function () {return subtype},
                  treeid: function () {return vm.treeid},
                }
              })
            }
        };

    vm.handleServiceTree = function (type) {
      const selectResourceArr = []
      angular.forEach(vm.checkboxes.items, function (value, key) {
        if (value) {
          selectResourceArr.push(key)
        }
      });
      const selectResDetail = vm.checkDataList.filter(item => selectResourceArr.find(cItem => cItem === item.uuid));

      if (type !== 'x') {
        $uibModal.open({
          templateUrl: 'app/pages/device/data/dialog/serviceTree/serviceTree.html',
          controller: 'ServiceTreeController',
          controllerAs: 'serviceTree',
          backdrop: 'static',
          size: 'md',
          keyboard: false,
          bindToController: true,
          resolve: {
            type: function () { return type },
            treeid: function () { return vm.treeid },
            selectResDetail: function () { return selectResDetail},
          }
        });
      } else {
        swal({
          title: '归还资源到资源池',
          type: "warning",
          showCancelButton: true,
          confirmButtonColor: "#DD6B55",
          cancelButtonText: "取消",
          confirmButtonText: "确定",
          closeOnConfirm: true
        }, function () {
          angular.forEach(selectResDetail, function (item) {
            $http.post(`/api/agent/device/tree/bind/${item.type}/${item.subtype}/${item.uuid}/${type}`).success(function (data) {
              if (data.stat == true) {
                toastr.success("操作完成");
                vm.cancel();
                vm.reload();
              } else {
                toastr.error("操作失败:" + data.info)
              }
            });
          })
        });
      }
    }

    vm.downloadFunc = function (fileName) {
      if (!vm.downloadTitle) {
        vm.downloadTitle = []
      };
      const downLoadArr = [];
      vm.downloadData.forEach(item => {
        const newData = {};
        if (!vm.downloadTitle.length) {
          downLoadArr.push(item)
          return
        };
        vm.downloadTitle.forEach(cItem => { newData[cItem] = item[cItem] });
        downLoadArr.push(newData);
      });
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(downLoadArr);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', stream: true });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, fileName);
    }

    // 监听全选checkbox
    $scope.$watch(function () {return vm.checkboxes.checked }, function (value) {
      angular.forEach(vm.checkDataList, function (item, index, array) {
        vm.checkboxes.items[[array[index].uuid]] = value
      });
      vm.checkboxes.itemsNumber = Object.values(vm.checkboxes.items).filter(item => item === true).length
      let nodeList = []
      for (let key in vm.checkboxes.items) {
        nodeList.push(String(key))
      }
    }, true);

    // 监听单个列表项的checkbox
    $scope.$watch(function () { return vm.checkboxes.items }, function (value) {
        var checked = 0, unchecked = 0
        angular.forEach(vm.checkDataList, function (item, index, array) {
          checked += (vm.checkboxes.items[array[index].uuid]) || 0;
          unchecked += (!vm.checkboxes.items[array[index].uuid]) || 0;
        });
        if (vm.checkDataList.length > 0 && ((unchecked == 0) || (checked == 0))) {
          vm.checkboxes.checked = (checked == vm.checkDataList.length);
        }
        vm.checkboxes.itemsNumber = checked
        angular.element(document.getElementsByClassName("select-all")).prop("indeterminate", (checked != 0 && unchecked != 0));
      }, true);
    }
})();
