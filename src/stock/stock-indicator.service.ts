import { Injectable } from '@nestjs/common';
import { RSI, SMA, MACD, BollingerBands } from 'technicalindicators';


/* 아직 사용하지 않는 함수 입니다 회의를 통해 어디서 계산할지 결정할예정 (nestjs냐 python중 어디서 계산할지 결정할예정) */
@Injectable()
export class StockIndicatorService {
  calculateIndicators(rawData: any[]) {
    // 1. 계산에 필요한 마감가(Close) 배열 추출
    const closes = rawData.map(d => d.close);
    const highs = rawData.map(d => d.high);
    const lows = rawData.map(d => d.low);

    // 2. 이동평균선 (20일) 특징 : 20일 동안의 주가 평균을 계산하여 추세를 표시
    const ma20Values = SMA.calculate({ period: 20, values: closes });

    // 3. RSI (14일) 특징 : 14일 동안의 주가 변동을 분석하여 과매수 또는 과매도 상태를 표시
    const rsiValues = RSI.calculate({ period: 14, values: closes });

    // 4. MACD (12, 26, 9) 특징 : 12일 주기의 이동평균선과 26일 주기의 이동평균선의 차이를 9일 주기의 이동평균선으로 표시
    const macdValues = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closes,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    // 5. 볼린저 밴드 (20일, 표준편차 2) 특징 : 20일 동안의 주가 평균을 계산하여 추세를 표시
    const bbValues = BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2,
    });

    // 6. 데이터 매칭 (데이터 길이에 주의해야 함)
    // 지표들은 앞부분의 데이터(Period만큼)가 계산되지 않아 배열 길이가 짧습니다.
    // 따라서 원본 데이터의 날짜와 지표 값을 뒤에서부터 매칭하여 저장 객체를 만듭니다.
    return rawData.map((data, index) => {
      // 이동평균선: 20일이므로 20번째 데이터부터 존재 (index 19부터)
      const ma20Index = index - (20 - 1);
      
      // RSI: 14일이므로 15번째 데이터부터 존재 (index 14부터)
      const rsiIndex = index - 14;

      // MACD: slowPeriod(26)이므로 27번째 데이터부터 존재 (index 26부터)
      const macdIndex = index - 26;

      // 볼린저 밴드: 20일이므로 20번째 데이터부터 존재 (index 19부터)
      const bbIndex = index - (20 - 1);

      return {
        ...data,
        ma20: ma20Index >= 0 && ma20Index < ma20Values.length ? ma20Values[ma20Index] : null,
        rsi: rsiIndex >= 0 && rsiIndex < rsiValues.length ? rsiValues[rsiIndex] : null,
        macd: macdIndex >= 0 && macdIndex < macdValues.length ? macdValues[macdIndex].MACD : null,
        macdSignal: macdIndex >= 0 && macdIndex < macdValues.length ? macdValues[macdIndex].signal : null,
        macdHistogram: macdIndex >= 0 && macdIndex < macdValues.length ? macdValues[macdIndex].histogram : null,
        bbUpper: bbIndex >= 0 && bbIndex < bbValues.length ? bbValues[bbIndex].upper : null,
        bbMiddle: bbIndex >= 0 && bbIndex < bbValues.length ? bbValues[bbIndex].middle : null,
        bbLower: bbIndex >= 0 && bbIndex < bbValues.length ? bbValues[bbIndex].lower : null,
      };
    });
  }
}

