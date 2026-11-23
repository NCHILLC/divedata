import { router, useLocalSearchParams } from 'expo-router';
import { parseMeetInfo, parseMeetResults } from '../../divemeets/parsers';
import { usePage } from '../../divemeets/source';
import { liveNow } from '../../scoring';
import { Body, Card, Heading, PageView, Screen, Title } from '../../ui';

export default function Meet() {
  const { meetNumber } = useLocalSearchParams<{ meetNumber: string }>();
  const { state, reload } = usePage(`meetresultsext.php?meetnum=${Number(meetNumber)}`, parseMeetResults);
  // DiveMeets can leave an earlier day's board marked Started, so when one is, the meet's schedule is read too.
  const started = state.status === 'ready' && state.data.live.some((e) => e.running);
  const schedule = usePage(started ? `meetinfoext.php?meetnum=${Number(meetNumber)}` : undefined, parseMeetInfo).state;

  return (
    <Screen title="Meet">
      <PageView state={state} reload={reload}>
        {(meet) => {
          // Waits for the schedule, so a board doesn't show and then vanish. If it can't be read, every Started board shows.
          const boards =
            schedule.status === 'loading'
              ? []
              : liveNow(meet.live, schedule.status === 'ready' ? schedule.data.events : undefined, today());
          return (
            <>
              <Title>{meet.name}</Title>
              {boards.length > 0 && <Heading>Live now</Heading>}
              {boards.map((e) => (
                <Card
                  key={e.path}
                  label={`Open live board, ${[e.name, e.stage].filter(Boolean).join(', ')}`}
                  highlight
                  onPress={() => router.push({ pathname: '/live', params: { path: e.path } })}
                >
                  <Body>{e.name}</Body>
                  {e.stage && <Body muted>{e.stage}</Body>}
                </Card>
              ))}
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
          );
        }}
      </PageView>
    </Screen>
  );
}

/** The phone's date as `YYYY-MM-DD`, to compare with the schedule's days. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
