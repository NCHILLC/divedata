import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { parseEventResults } from '../divemeets/parsers';
import { usePage } from '../divemeets/source';
import { useFollows } from '../follows';
import { Body, Card, Heading, MyDiverTag, Num, PageView, placeWords, points, Screen, styles, Title } from '../ui';

/** One event's results. `path` is the DiveMeets results page the meet screen linked to. */
export default function Event() {
  const { path } = useLocalSearchParams<{ path: string }>();
  const { state, reload } = usePage(path, parseEventResults);
  const { isFollowed } = useFollows();

  return (
    <Screen title="Results">
      <PageView state={state} reload={reload}>
        {(event) => (
          <>
            <Title>{event.eventName}</Title>
            {event.stage && <Heading>{event.stage}</Heading>}
            {event.rows.map((r) => {
              const mine = isFollowed(r.diver.diverNumber);
              const sheet = r.diveSheetPath;
              const words = `${r.diver.name}, place ${placeWords(r)}, total ${points(r.total)}. Open their dives`;
              return (
                <Card
                  key={r.diver.diverNumber}
                  label={mine ? `My diver: ${words}` : words}
                  highlight={mine}
                  onPress={() => sheet && router.push({ pathname: '/dives', params: { path: sheet } })}
                >
                  {mine && <MyDiverTag />}
                  <View style={styles.spread}>
                    <Num>{placeWords(r)}</Num>
                    <View style={{ flex: 1 }}>
                      <Body>{r.diver.name}</Body>
                      {r.team && <Body muted>{r.team}</Body>}
                    </View>
                    <Num>{points(r.total)}</Num>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </PageView>
    </Screen>
  );
}
