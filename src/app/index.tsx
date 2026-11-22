import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { parseDiverProfile, parseMeetLink, parseMeetList, type DiverRef } from '../divemeets/parsers';
import { usePage } from '../divemeets/source';
import { useFollows } from '../follows';
import { useLive } from '../live';
import { Body, Button, Card, color, Heading, Num, PageView, placeWords, points, Screen, styles, Title } from '../ui';

const openMeet = (meetNumber: number) =>
  router.push({ pathname: '/meet/[meetNumber]', params: { meetNumber: String(meetNumber) } });

function FollowedDiver({ diver }: { diver: DiverRef }) {
  const { state, reload } = usePage(`profile.php?number=${diver.diverNumber}`, parseDiverProfile);
  return (
    <Card
      label={`Open ${diver.name}`}
      highlight
      onPress={() => router.push({ pathname: '/diver/[diverNumber]', params: { diverNumber: String(diver.diverNumber) } })}
    >
      <Body>{diver.name}</Body>
      <PageView state={state} reload={reload}>
        {(profile) => {
          const meet = profile.meets[0];
          const event = meet?.events.at(-1);
          if (!meet || !event) return <Body muted>No results yet.</Body>;
          return (
            <View>
              <Body muted>{meet.name}</Body>
              <Body muted>{event.name}</Body>
              <Num>{`Place ${placeWords(event)} · Total ${points(event.total)}`}</Num>
            </View>
          );
        }}
      </PageView>
    </Card>
  );
}

/** While live mode follows a board: a way back to it, and Stop. */
function FollowingLive() {
  const live = useLive();
  const path = live.path;
  if (!path) return null;
  return (
    <>
      <Card
        label="Open the live board you're following"
        highlight
        onPress={() => router.push({ pathname: '/live', params: { path } })}
      >
        <Body>{`Following live: ${live.board?.eventName ?? 'a live board'}`}</Body>
        {live.error && <Body muted>Trying again</Body>}
      </Card>
      <Button label="Stop following live" onPress={live.stop} />
    </>
  );
}

export default function Home() {
  const { divers } = useFollows();
  const [query, setQuery] = useState('');
  const { state, reload } = usePage('index.php', parseMeetList);
  const meetNumber = parseMeetLink(query);
  const words = query.trim().toLowerCase();

  return (
    <Screen title="DiveData">
      <Title>DiveData</Title>
      <FollowingLive />

      <Heading>My divers</Heading>
      {divers.length === 0 ? (
        <Body muted>Open a diver from any results list and tap Follow.</Body>
      ) : (
        divers.map((d) => <FollowedDiver key={d.diverNumber} diver={d} />)
      )}

      <Heading>Meets</Heading>
      <TextInput
        accessibilityLabel="Find a meet"
        placeholder="Meet name, number or DiveMeets link"
        placeholderTextColor={color.outline}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {meetNumber !== undefined && (
        <Button label={`Open meet ${meetNumber}`} filled onPress={() => openMeet(meetNumber)} />
      )}
      <PageView state={state} reload={reload}>
        {(meets) => {
          const shown = meets.filter((m) => m.name.toLowerCase().includes(words));
          if (shown.length === 0 && meetNumber === undefined) return <Body muted>No meet on DiveMeets matches that.</Body>;
          return shown.map((m) => (
            <Card key={m.meetNumber} label={`Open ${m.name}`} onPress={() => openMeet(m.meetNumber)}>
              <Body>{m.name}</Body>
              <Body muted>
                {[dateRange(m.startDate, m.endDate), [m.city, m.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </Body>
            </Card>
          ));
        }}
      </PageView>
    </Screen>
  );
}

/** "Nov 17 – Nov 20, 2026" from two YYYY-MM-DD dates. */
function dateRange(start: string, end: string): string {
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const text = start === end ? day(start) : `${day(start)} – ${day(end)}`;
  return `${text}, ${end.slice(0, 4)}`;
}
