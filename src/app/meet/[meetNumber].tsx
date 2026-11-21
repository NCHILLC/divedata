import { router, useLocalSearchParams } from 'expo-router';
import { parseMeetResults } from '../../divemeets/parsers';
import { usePage } from '../../divemeets/source';
import { Body, Card, PageView, Screen, Title } from '../../ui';

export default function Meet() {
  const { meetNumber } = useLocalSearchParams<{ meetNumber: string }>();
  const { state, reload } = usePage(`meetresultsext.php?meetnum=${Number(meetNumber)}`, parseMeetResults);

  return (
    <Screen title="Meet">
      <PageView state={state} reload={reload}>
        {(meet) => (
          <>
            <Title>{meet.name}</Title>
            {meet.events.length === 0 && <Body muted>No results yet. Check back once the meet starts.</Body>}
            {meet.events.map((e) => {
              const path = e.resultsPath;
              return (
                <Card
                  key={`${e.eventNumber}-${e.eventType}`}
                  label={`Open ${[e.name, e.stage].filter(Boolean).join(', ')}`}
                  onPress={() => path && router.push({ pathname: '/event', params: { path } })}
                >
                  <Body>{e.name}</Body>
                  <Body muted>{[e.stage, e.date].filter(Boolean).join(' · ')}</Body>
                </Card>
              );
            })}
          </>
        )}
      </PageView>
    </Screen>
  );
}
