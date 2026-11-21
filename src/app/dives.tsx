import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { parseDiveSheet } from '../divemeets/parsers';
import { usePage } from '../divemeets/source';
import { Body, Button, Num, PageView, placeWords, points, Screen, styles, Title } from '../ui';

/** One diver's dives in one event, round by round. `path` is the DiveMeets dive sheet page. */
export default function Dives() {
  const { path } = useLocalSearchParams<{ path: string }>();
  const { state, reload } = usePage(path, parseDiveSheet);

  return (
    <Screen title="Dives">
      <PageView state={state} reload={reload}>
        {(sheet) => (
          <>
            <Title>{sheet.diver.name}</Title>
            <Body muted>{sheet.eventName}</Body>
            <Button
              label={`Open ${sheet.diver.name}'s page`}
              onPress={() =>
                router.push({ pathname: '/diver/[diverNumber]', params: { diverNumber: String(sheet.diver.diverNumber) } })
              }
            />
            {sheet.dives.length === 0 && <Body muted>No dives scored yet.</Body>}
            {sheet.dives.map((d) => (
              <View key={d.round} style={styles.card} accessible>
                <View style={styles.spread}>
                  <Body>{[`Round ${d.round}`, d.diveNumber, d.height].filter(Boolean).join(' · ')}</Body>
                  <Num>{points(d.score)}</Num>
                </View>
                {d.description && <Body muted>{d.description}</Body>}
                <Body muted>
                  {`DD ${d.dd}`}
                  {d.roundPlace !== undefined && ` · Place ${placeWords({ place: d.roundPlace, tied: d.roundPlaceTied })}`}
                </Body>
              </View>
            ))}
            <View style={styles.card}>
              <Num big>{`Total ${points(sheet.total)}`}</Num>
            </View>
          </>
        )}
      </PageView>
    </Screen>
  );
}
