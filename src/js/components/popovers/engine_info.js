import RenderComponent from "../../render/render_component";

export default class EngineInfoPopover extends RenderComponent{
    constructor(options){
        super(undefined, 'engine_info', undefined);

        this.id = '[data-engine-info].engine-info';
        this.engines = options.engines;
        this._init();
    }

    _init(){
        let that = this;
        // Bind popover to an element that will never be removed and use selector option instead
        $('#cap-table-div').popover({
            trigger: 'hover',
            html : true,
            placement: 'auto top',
            container: '.content-wrapper',
            selector: that.id,
            content: function() {
                return that._renderContent($(this).attr('data-engine-info'))
            },
            title: function() {
                return '<span>Engine</span> '  + that._getEngineNameId($(this).attr('data-engine-info'));
            }
        });


        $('body').on('click', function (e) {
            $('[data-engine-info].engine-info').each(function () {
                if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                    $(this).popover('hide');
                }

            });
        });

    }

    _renderContent(engineIndex){
         this.context['engine'] = this.engines[engineIndex];
        return super.renderTemplate();
    }

    _getEngineNameId(engineIndex){
        return this.engines[engineIndex].name + ' '  + this.engines[engineIndex].version;
    }
}