(function() {
  describe('test jquery-cron', function() {
    // Get access to the internal functions.
    var cron = $.fn.cron('test');

    var getTestEl = function() {
      var $testEl = $('#test');
      return $testEl;
    };

    describe('test it returns the correct cron type', function() {
      it('should throw an invalid initial value exception', function() {
        var getCronType = cron.getCronType.bind(cron, '');
        getCronType.should.throw('cron: invalid initial value');
      });

      it('should throw an unsupported cron format exception', function() {
        var getCronType = cron.getCronType.bind(cron, '1 1 1 1 1');
        getCronType.should.throw('cron: valid but unsupported cron format');
      });

      it('should return "minute"', function() {
        cron.getCronType("* * * * *").should.equal('minute');
      });

      it('should return "hour"', function() {
        cron.getCronType("1 * * * *").should.equal('hour');
        cron.getCronType("1,2 * * * *").should.equal('hour');
      });

      it('should return "day"', function() {
        cron.getCronType("1 1 * * *").should.equal('day');
      });

      it('should return "week"', function() {
        cron.getCronType("1 1 * * 1").should.equal('week');
      });

      it('should return "month"', function() {
        cron.getCronType("1 1 1 * *").should.equal('month');
      });

      it('should return "year"', function() {
        cron.getCronType("0 0 1 1 *").should.equal('year');
        cron.getCronType("1,2 0,1,2 1,2 1,2 *").should.equal('year');
      });
    });

    describe('test cron initialization', function() {
      var counter = 0;

      function getCurrCronUiEl() {
        var $testEl = getTestEl();
        return $testEl.find('#cron-ui-' + counter);
      }

      function getCurrCronValEl() {
        var $testEl = getTestEl();
        return $testEl.find('#cron-val-' + counter);
      }

      before(function() {
        var $testEl = getTestEl();
        $testEl.append('<ul id="cron-test"/>');
      });

      beforeEach(function() {
        var $li = getTestEl().find('ul#cron-test').append('<li id="cron-test-' + counter + '"/>');
        $li.append($('<div id="cron-num-' + counter + '"><b>Cron #' + counter + '</b></div>'));
        $li.append($('<div id="cron-ui-' + counter + '"/>'));
        $li.append('<div id="cron-val-' + counter + '"/>');
      });

      afterEach(function() {
        counter++;
      });

      it('should initialize a "minute" cron', function() {
        var $cron = getCurrCronUiEl().cron({
          initial: '* * * * *',
          onChange: function() {
            var cronVal = getCurrCronValEl().text($(this).cron("value"));
          }
        });

        var $cronPeriodEl = $cron.find('.cron-period');
        $cronPeriodEl.should.have.length(1);
        $cronPeriodEl.css('display').should.not.equal('none');
        $cronPeriodEl.find('.gentleselect-label').text().should.equal('minute');

        var $cronBlockDomEl = $cron.find('.cron-block-dom');
        $cronBlockDomEl.should.have.length(1);
        $cronBlockDomEl.css('display').should.equal('none');
        $cronBlockDomEl.find('.gentleselect-label').text().should.equal('1st');

        var $cronBlockMonthEl = $cron.find('.cron-block-month');
        $cronBlockMonthEl.should.have.length(1);
        $cronBlockMonthEl.css('display').should.equal('none');
        $cronBlockMonthEl.find('.gentleselect-label').text().should.equal('January');

        var $cronBlockMinsEl = $cron.find('.cron-block-mins');
        $cronBlockMinsEl.should.have.length(1);
        $cronBlockMinsEl.css('display').should.equal('none');
        $cronBlockMinsEl.find('.gentleselect-label').text().should.equal('00');

        var $cronBlockDowEl = $cron.find('.cron-block-dow');
        $cronBlockDowEl.should.have.length(1);
        $cronBlockDowEl.css('display').should.equal('none');
        $cronBlockDowEl.find('.gentleselect-label').text().should.equal('Sunday');

        var $cronBlockTimeHourEl = $cron.find('.cron-time-hour');
        $cronBlockTimeHourEl.should.have.length(1);
        $cronBlockTimeHourEl.css('display').should.equal('none');
        $cronBlockTimeHourEl.find('.gentleselect-label').text().should.equal('00');

        var $cronBlockTimeMinEl = $cron.find('.cron-time-min');
        $cronBlockTimeMinEl.should.have.length(1);
        $cronBlockTimeMinEl.css('display').should.equal('none');
        $cronBlockTimeMinEl.find('.gentleselect-label').text().should.equal('00');
      });

      it('should initialize a "week" cron', function() {
        var $cron = getCurrCronUiEl().cron({
          initial: '0,15,30 5 * * 1,2',
          onChange: function() {
            var cronVal = getCurrCronValEl().text($(this).cron("value"));
          }
        });

        var $cronPeriodEl = $cron.find('.cron-period');
        $cronPeriodEl.should.have.length(1);
        $cronPeriodEl.css('display').should.not.equal('none');
        $cronPeriodEl.find('.gentleselect-label').text().should.equal('week');

        var $cronBlockDomEl = $cron.find('.cron-block-dom');
        $cronBlockDomEl.should.have.length(1);
        $cronBlockDomEl.css('display').should.equal('none');
        $cronBlockDomEl.find('.gentleselect-label').text().should.equal('1st');

        var $cronBlockMonthEl = $cron.find('.cron-block-month');
        $cronBlockMonthEl.should.have.length(1);
        $cronBlockMonthEl.css('display').should.equal('none');
        $cronBlockMonthEl.find('.gentleselect-label').text().should.equal('January');

        var $cronBlockMinsEl = $cron.find('.cron-block-mins');
        $cronBlockMinsEl.should.have.length(1);
        $cronBlockMinsEl.css('display').should.equal('none');
        $cronBlockMinsEl.find('.gentleselect-label').text().should.equal('00');

        var $cronBlockDowEl = $cron.find('.cron-block-dow');
        $cronBlockDowEl.should.have.length(1);
        $cronBlockDowEl.css('display').should.not.equal('none');
        $cronBlockDowEl.find('.gentleselect-label').text().should.equal('MondayTuesday');

        var $cronBlockTimeHourEl = $cron.find('.cron-time-hour');
        $cronBlockTimeHourEl.should.have.length(1);
        $cronBlockTimeHourEl.css('display').should.not.equal('none');
        $cronBlockTimeHourEl.find('.gentleselect-label').text().should.equal('05');

        var $cronBlockTimeMinEl = $cron.find('.cron-time-min');
        $cronBlockTimeMinEl.should.have.length(1);
        $cronBlockTimeMinEl.css('display').should.not.equal('none');
        $cronBlockTimeMinEl.find('.gentleselect-label').text().should.equal('001530');
      });
    });
  });
}).call(this);
